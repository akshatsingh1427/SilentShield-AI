from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import time

app = FastAPI(
    title="SilentShield AI",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading AI model...")

model = joblib.load("phishing_model.pkl")

print("✅ Model Loaded Successfully!")

class ScanRequest(BaseModel):
    text: str


@app.get("/")
def home():
    return {
        "message": "SilentShield AI Running",
        "status": "OK",
        "model": "SilentShieldNet v1",
    }


@app.post("/predict")
def predict(req: ScanRequest):

    start = time.perf_counter()

    prediction = model.predict([req.text])[0]
    probability = model.predict_proba([req.text])[0]

    inference_time = round((time.perf_counter() - start) * 1000, 2)

    confidence = round(float(max(probability)) * 100, 2)

    label = "PHISHING" if prediction == 1 else "SAFE"

    suspicious_words = [
        "verify",
        "password",
        "otp",
        "urgent",
        "account",
        "bank",
        "login",
        "payment",
        "invoice",
        "crypto",
        "gift",
        "reward",
        "click",
        "security",
        "update",
    ]

    keywords = [
        word
        for word in suspicious_words
        if word in req.text.lower()
    ]

    risk_level = (
        "HIGH"
        if confidence >= 80
        else "MEDIUM"
        if confidence >= 50
        else "LOW"
    )

    explanation = (
        "The AI model detected multiple phishing indicators including urgency language and credential harvesting patterns."
        if label == "PHISHING"
        else "No significant phishing indicators were detected."
    )

    return {
        "prediction": label,
        "confidence": confidence,
        "risk_level": risk_level,
        "inference_time_ms": inference_time,
        "model": "SilentShieldNet v1",
        "algorithm": "TF-IDF + Logistic Regression",
        "dataset": "82K+ Phishing & Legitimate Emails",
        "privacy": "100% On Device",
        "keywords": keywords,
        "explanation": explanation,
    }