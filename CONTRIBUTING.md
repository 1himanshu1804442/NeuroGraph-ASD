# Contributing to NeuroGraph-ASD

Thank you for your interest in contributing to **NeuroGraph-ASD**! We welcome researchers, neuroscientists, clinicians, and software engineers to collaborate on advancing explainable geometric deep learning in computational psychiatry.

---

## 🛠️ Tech Stack & Prerequisites

* **Backend Gateway:** Java 17+, Spring Boot 3.2.x, Maven 3.9+, PostgreSQL 16
* **Frontend Dashboard:** React 18, Vite 6, Three.js, Tailwind CSS, TanStack Query
* **AI & Geometric Engine:** Python 3.11+, PyTorch 2.x, PyTorch Geometric (`PyG`), Nilearn, Nibabel

---

## 🚀 Development Workflow

1. **Fork the Repository** on GitHub.
2. **Clone your fork locally:**
   ```bash
   git clone https://github.com/<your-username>/NeuroGraph-ASD.git
   cd NeuroGraph-ASD
   ```
3. **Create a descriptive feature branch:**
   ```bash
   git checkout -b feature/clinical-xai-enhancement
   ```
4. **Enforce Coding & Architectural Standards:**
   * **Java Spring Boot:** Strictly adhere to Layered Architecture (`Controller` $\rightarrow$ `Service` $\rightarrow$ `Repository`), `@RequiredArgsConstructor` constructor injection, `@ControllerAdvice` error handling, and `@Slf4j` verbose logging.
   * **React Frontend:** Use functional components with hooks, extract all API calls to `src/services/api.js`, and maintain strict dark theme bounce resets in `index.css`.
   * **Unit Tests First:** Verify all JUnit 5 tests pass before submitting (`mvn clean test` in `backend-spring/`).
5. **Run the 1-Command Local Dev Environment:**
   ```powershell
   .\dev.ps1
   ```
6. **Commit with Conventional Commits:**
   ```bash
   git commit -m "feat(backend): add longitudinal connectome trajectory tracking"
   ```
7. **Push to your fork and submit a Pull Request.**

---

## 📜 Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms.
