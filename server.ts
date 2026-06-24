import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Issue, IssueCategory, IssueSeverity } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup directories
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Increase limits for handling base64 image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Serve static uploaded files
app.use("/uploads", express.static(UPLOADS_DIR));

// Initialize Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is not defined. Falling back to local heuristics.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Coordinate to Neighborhood Mapper (for a 100x100 custom grid)
function getAreaByCoordinates(lat: number, lng: number): string {
  // lat is Y (vertical), lng is X (horizontal) on our grid
  if (lat < 35) {
    return "Civil Lines";
  } else if (lat > 65) {
    return "Dugri";
  } else if (lng < 35) {
    return "Ferozepur Road";
  } else if (lng > 65) {
    return "Sarabha Nagar";
  } else {
    return "Model Town";
  }
}

// Initial Mock Seed Data
const initialSeedIssues: Issue[] = [
  {
    id: "seed-1",
    photoUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800",
    latitude: 50, // Model Town
    longitude: 48,
    area: "Model Town",
    category: "pothole",
    severity: "high",
    description: "Deep pothole located right in the center of Link Road near Gol Market crossing in Model Town. Causing significant traffic jams and risk to two-wheelers.",
    userNote: "Spotted this on my way to the market. It is extremely deep, scooters and motorcycles are swerving dangerously!",
    status: "open",
    confirmationCount: 14,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: "seed-2",
    photoUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=800",
    latitude: 22, // Civil Lines
    longitude: 30,
    area: "Civil Lines",
    category: "streetlight",
    severity: "medium",
    description: "A streetlight at the intersection of Mall Road in Civil Lines is completely burnt out. The intersection is extremely dark and dangerous at night.",
    userNote: "This whole corner of Mall Road is pitch black at night. Kids and senior citizens walk home this way.",
    status: "open",
    confirmationCount: 6,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  },
  {
    id: "seed-3",
    photoUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=800",
    latitude: 78, // Dugri
    longitude: 45,
    area: "Dugri",
    category: "garbage",
    severity: "medium",
    description: "Large heap of unsorted household and commercial waste dumped illegally at the entrance of Dugri Phase 1 community park.",
    userNote: "Disgusting pile of trash right next to the park entrance. Stray animals are gathering here.",
    status: "resolved",
    confirmationCount: 22,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
  },
  {
    id: "seed-4",
    photoUrl: "https://images.unsplash.com/photo-1585573424424-39657b9ac7f6?auto=format&fit=crop&q=80&w=800",
    latitude: 45, // Sarabha Nagar
    longitude: 80,
    area: "Sarabha Nagar",
    category: "water leak",
    severity: "high",
    description: "Significant water pipe leakage on Kip's Market walkway, bubbling up through the pavement and causing local flooding.",
    userNote: "Clean drinking water is literally rushing into the street. Looks like a main water pipe burst near Kip's Market.",
    status: "open",
    confirmationCount: 19,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  }
];

// Read issues from DB file
function readIssues(): Issue[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialSeedIssues, null, 2));
      return initialSeedIssues;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data) as Issue[];
  } catch (error) {
    console.error("Error reading issues database:", error);
    return [];
  }
}

// Write issues to DB file
function writeIssues(issues: Issue[]): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(issues, null, 2));
  } catch (error) {
    console.error("Error writing to issues database:", error);
  }
}

// API: Get all issues
app.get("/api/reports", (req, res) => {
  const issues = readIssues();
  res.json(issues);
});

// API: Report a new issue
app.post("/api/reports", async (req, res) => {
  const { photo, latitude, longitude, userNote } = req.body;

  if (!photo) {
    res.status(400).json({ error: "Photo is required" });
    return;
  }

  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: "Location coordinates (latitude & longitude) are required" });
    return;
  }

  try {
    // 1. Process base64 photo and write to files directory
    let photoUrl = "";
    const matches = photo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      const base64Data = matches[2];
      const ext = mimeType.split("/")[1] || "png";
      const fileName = `report_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      photoUrl = `/uploads/${fileName}`;
    } else {
      // If photo is already a URL (fallback)
      photoUrl = photo;
    }

    // 2. Map coordinates to a neighborhood area
    const area = getAreaByCoordinates(latitude, longitude);

    // 3. Run Gemini analysis (with standard fallback)
    let category: IssueCategory = "other";
    let severity: IssueSeverity = "medium";
    let description = "A reported civic issue requiring inspection.";

    const aiClient = getGeminiClient();
    if (aiClient && photo.startsWith("data:")) {
      console.log("Starting Gemini Vision AI analysis for uploaded photo...");
      try {
        const base64Clean = photo.substring(photo.indexOf(",") + 1);
        const mimeType = photo.substring(photo.indexOf(":") + 1, photo.indexOf(";"));
        console.log(`Extracted MIME type: ${mimeType || "image/png"} (Base64 clean length: ${base64Clean.length})`);

        const imagePart = {
          inlineData: {
            data: base64Clean,
            mimeType: mimeType || "image/png"
          }
        };

        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: {
            parts: [
              imagePart,
              {
                text: "Analyze this photo of a civic or community issue. Select the most appropriate category strictly from: 'pothole', 'streetlight', 'garbage', 'water leak', or 'other'. Estimate the severity strictly as 'low', 'medium', or 'high'. Write a concise description (maximum 2 sentences) describing what's damaged or broken. Return the response in clean JSON matching the requested schema."
              }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  description: "Must be exactly one of: pothole, streetlight, garbage, water leak, other"
                },
                severity: {
                  type: Type.STRING,
                  description: "Must be exactly one of: low, medium, high"
                },
                description: {
                  type: Type.STRING,
                  description: "A short, objective 1-2 sentence description of the civic problem."
                }
              },
              required: ["category", "severity", "description"]
            }
          }
        });

        const resultText = response.text;
        console.log("Raw Gemini API response text:", resultText);

        if (resultText) {
          const parsed = JSON.parse(resultText.trim());
          console.log("Parsed Gemini JSON object:", parsed);
          if (parsed.category) {
            category = parsed.category.toLowerCase().trim() as IssueCategory;
          }
          if (parsed.severity) {
            severity = parsed.severity.toLowerCase().trim() as IssueSeverity;
          }
          if (parsed.description) {
            description = parsed.description.trim();
          }
          console.log(`Resulting Fields -> Category: "${category}", Severity: "${severity}", Description: "${description}"`);
        } else {
          console.warn("Gemini returned empty text or no response. Using local fallback.");
        }
      } catch (geminiError) {
        console.error("Gemini analysis failed or threw an error:", geminiError);
        console.log("Proceeding with keyword-based local heuristics fallback...");
        // Fallback standard classification based on userNote keywords
        const note = (userNote || "").toLowerCase();
        if (note.includes("pothole") || note.includes("hole") || note.includes("road") || note.includes("street")) {
          category = "pothole";
          severity = "medium";
          description = "Pothole or road surface damage needing repair.";
        } else if (note.includes("light") || note.includes("dark") || note.includes("lamp") || note.includes("bulb")) {
          category = "streetlight";
          severity = "low";
          description = "Streetlight malfunction or dark area reported.";
        } else if (note.includes("trash") || note.includes("garbage") || note.includes("litter") || note.includes("waste") || note.includes("dump")) {
          category = "garbage";
          severity = "medium";
          description = "Illegal dumping or accumulated trash in neighborhood.";
        } else if (note.includes("water") || note.includes("leak") || note.includes("pipe") || note.includes("flood") || note.includes("burst")) {
          category = "water leak";
          severity = "high";
          description = "Water leak or drainage problem causing excess water flow.";
        } else {
          category = "other";
          severity = "medium";
          description = "Reported community issue requiring municipal inspection.";
        }
      }
    } else {
      console.log(`Gemini client unavailable or photo not starting with data: URI. (aiClient: ${!!aiClient}, photo starts with "data:": ${photo ? photo.startsWith("data:") : false}). Using keyword-based local heuristics...`);
      // Direct local default if no Gemini API Key is configured
      const note = (userNote || "").toLowerCase();
      if (note.includes("pothole") || note.includes("hole") || note.includes("road") || note.includes("street")) {
        category = "pothole";
        severity = "medium";
        description = "Pothole or road surface damage needing repair.";
      } else if (note.includes("light") || note.includes("dark") || note.includes("lamp") || note.includes("bulb")) {
        category = "streetlight";
        severity = "low";
        description = "Streetlight malfunction or dark area reported.";
      } else if (note.includes("trash") || note.includes("garbage") || note.includes("litter") || note.includes("waste") || note.includes("dump")) {
        category = "garbage";
        severity = "medium";
        description = "Illegal dumping or accumulated trash in neighborhood.";
      } else if (note.includes("water") || note.includes("leak") || note.includes("pipe") || note.includes("flood") || note.includes("burst")) {
        category = "water leak";
        severity = "high";
        description = "Water leak or drainage problem causing excess water flow.";
      } else {
        category = "other";
        severity = "medium";
        description = "Reported community issue requiring municipal inspection.";
      }
    }

    // Double-check values are within valid options
    const validCategories: IssueCategory[] = ["pothole", "streetlight", "garbage", "water leak", "other"];
    const validSeverities: IssueSeverity[] = ["low", "medium", "high"];

    if (!validCategories.includes(category)) category = "other";
    if (!validSeverities.includes(severity)) severity = "medium";

    // 4. Create and save the new issue
    const newIssue: Issue = {
      id: `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      photoUrl,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      area,
      category,
      severity,
      description,
      userNote: userNote || undefined,
      status: "open",
      confirmationCount: 1, // Commencing report has 1 confirmation (the reporter)
      createdAt: new Date().toISOString()
    };

    const issues = readIssues();
    issues.unshift(newIssue);
    writeIssues(issues);

    res.status(201).json(newIssue);
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Failed to create civic report. Please try again." });
  }
});

// API: Confirm still an issue
app.post("/api/reports/:id/confirm", (req, res) => {
  const { id } = req.params;
  const issues = readIssues();
  const issueIndex = issues.findIndex((i) => i.id === id);

  if (issueIndex === -1) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }

  issues[issueIndex].confirmationCount += 1;
  writeIssues(issues);

  res.json(issues[issueIndex]);
});

// API: Mark issue as resolved
app.post("/api/reports/:id/resolve", (req, res) => {
  const { id } = req.params;
  const issues = readIssues();
  const issueIndex = issues.findIndex((i) => i.id === id);

  if (issueIndex === -1) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }

  issues[issueIndex].status = "resolved";
  writeIssues(issues);

  res.json(issues[issueIndex]);
});

// Setup Vite Dev server or Production Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Community Hero server running on port ${PORT}`);
  });
}

startServer();
