# LumosMaximAI - Project Blueprint

## 1. Project Overview
**Vision:** To provide a state-of-the-art Video Enhancement SaaS platform utilizing Deep Learning to perform denoising, low-light enhancement, and quality restoration on video files.
**Project Name:** LumosMaximAI
**Target Audience:** Security professionals analyzing surveillance footage, content creators looking to restore or improve video quality, and individuals needing professional-grade video enhancement.

## 2. Architecture
The application follows a modular architecture designed for scalability and asynchronous processing:
* **Frontend:** Next.js (App Router), Tailwind CSS, Lucide React
* **Backend:** FastAPI (Python)
* **Processing Queue:** Celery/Redis (or simple BackgroundTasks for MVP)
* **AI Model Inference:** OpenCV and PyTorch (for model execution), FFmpeg (for video manipulation/chunking)
* **Storage:** Local filesystem (MVP) with a path abstraction layer to easily transition to AWS S3 in the future.
* **Database:** SQLite (local) for user and job tracking

**Data Flow:**
`Frontend` -> `FastAPI` -> `Processing Queue` -> `AI Model Inference` -> `Output (Storage & DB update)` -> `Frontend`

## 3. Feature Roadmap
* **Phase 1: Local Upload & Basic Denoising**
  * Set up frontend upload interface and backend endpoint.
  * Implement simple denoising using Wavelet transforms or a simple CNN framework.
* **Phase 2: Low-light Enhancement**
  * Integrate advanced AI models for low-light enhancement (e.g., MIRNet or Zero-DCE lite).
* **Phase 3: Dashboard & Video Comparison UI**
  * Develop user dashboard to view history and job statuses.
  * Implement a "Before/After" side-by-side interactive comparison view for enhanced videos.
* **Phase 4: Stripe Integration & Cloud Storage**
  * Integrate Stripe for billing and subscription models.
  * Migrate local storage mechanism to AWS S3 or similar cloud storage solutions (Future-proofing).

## 4. Data Models
* **User**
  * Attributes: ID, Name/Email, Password Hash, Subscription Status, Quota/Credits, Created At.
* **VideoJob**
  * Attributes: Job ID, User ID, Original Video Path, Processed Video Path, Status (`pending`, `processing`, `completed`, `failed`), Task Type (`denoising`, `low_light`), Created At, Completed At.
* **Settings**
  * Attributes: Settings ID, User ID, Default Preferences (e.g., preferred enhancement model, notification preferences).

## 5. Technical Constraints
* **Video Chunking:** Ensure large videos are processed in manageable chunks to prevent memory overflow during AI inference and allow parallel processing if necessary.
* **Non-blocking UI:** The frontend must remain fully responsive during heavy backend processing. Job status should be tracked efficiently without locking up the client.
* **Before/After UI:** The comparison view must accurately synchronize the playback of both original and enhanced videos for a seamless visual comparison.
