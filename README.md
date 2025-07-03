# 🚀 Soham Tracker

<div align="center">

![Soham Tracker Logo](public/tauri.svg)

**A powerful, real-time desktop application for comprehensive activity tracking and productivity monitoring**

[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?style=flat-square&logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-000000?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Development](#-development) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🎯 **Real-Time Monitoring**

- **Live Activity Tracking** - Monitor window focus, application usage, and user interactions in real-time
- **Automatic Screenshots** - Capture periodic screenshots for visual activity logs
- **Real-Time Dashboard** - Live updates every 2 seconds without database polling
- **Event-Driven Architecture** - Efficient Tauri event system for instant updates

### 📊 **Advanced Analytics**

- **Interactive Charts** - Beautiful visualizations using Recharts (Bar, Pie, Line charts)
- **Time Tracking** - Detailed session tracking with duration analysis
- **Usage Statistics** - Application usage breakdown and productivity metrics
- **Daily/Weekly Reports** - Comprehensive activity summaries

### 🎨 **Modern UI/UX**

- **Dark/Light Themes** - Seamless theme switching with system preference detection
- **Smooth Animations** - Complex yet minimalistic animations using Framer Motion
- **Responsive Design** - Optimized for all screen sizes
- **Professional Interface** - Clean, modern design with glassmorphism effects

### 🔍 **Smart Features**

- **Advanced Search & Filtering** - Filter activities by date, application, or keyword
- **Screenshot Gallery** - Interactive gallery with modal preview and download options
- **Activity Feed** - Real-time stream of all tracked events
- **Productivity Scoring** - AI-powered efficiency calculations

---

## 🛠 Technology Stack

### **Frontend**

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development with full IntelliSense
- **Tailwind CSS** - Utility-first CSS framework for rapid styling
- **Framer Motion** - Production-ready motion library for React
- **Recharts** - Composable charting library built on React components
- **shadcn/ui** - High-quality, accessible UI components

### **Backend**

- **Rust** - Systems programming language for performance and safety
- **Tauri 2.0** - Cross-platform desktop app framework
- **SQLite** - Embedded database for local data storage
- **Tokio** - Asynchronous runtime for Rust
- **Serde** - Serialization framework for Rust

### **Build Tools**

- **Vite** - Next generation frontend tooling
- **ESLint & Prettier** - Code linting and formatting
- **Cargo** - Rust package manager and build system

---

## 📥 Installation

### **Prerequisites**

- **Node.js** (v18 or higher)
- **Rust** (latest stable version)
- **Git**

### **Quick Start**

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/soham-tracker.git
   cd soham-tracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run tauri dev
   ```

### **Build for Production**

```bash
# Build the application
npm run tauri build

# The built application will be in src-tauri/target/release/bundle/
```

---

## 🎮 Usage

### **Dashboard Overview**

The main dashboard consists of four primary sections:

#### 🏠 **Overview Tab**

- **Live System Status** - Real-time tracking indicator
- **Today's Metrics** - Active time, screenshots, applications, and sessions
- **Productivity Score** - AI-calculated efficiency rating
- **Recent Activity Preview** - Latest tracked events

#### 📈 **Analytics Tab**

- **Top Applications Chart** - Bar chart showing most-used applications
- **Usage Distribution** - Pie chart of time allocation
- **Timeline View** - Hourly activity and productivity trends
- **Session Analytics** - Detailed session breakdowns

#### 📋 **Activity Feed Tab**

- **Real-Time Events** - Live stream of window focus/blur events
- **Color-Coded Events** - Visual distinction between event types
- **Detailed Timeline** - Chronological activity history
- **Activity Statistics** - Event counts and summaries

#### 📸 **Screenshots Tab**

- **Interactive Gallery** - Grid view of captured screenshots
- **Smart Search** - Filter by date, filename, or content
- **Modal Preview** - Full-screen image viewing
- **Download Options** - Export screenshots individually

### **Controls**

- **⏸️ Pause/Resume** - Toggle tracking on/off
- **🌙 Theme Toggle** - Switch between dark and light modes
- **⚙️ Settings Menu** - Access preferences and data export options

---

## 🏗 Architecture

### **Data Flow**

```
User Activity → Rust Backend → SQLite Database → Tauri Events → React Frontend
```

### **Core Components**

#### **Rust Backend** (`src-tauri/src/`)

- **`main.rs`** - Application entry point and command registration
- **`db.rs`** - Database operations and schema management
- **`screenshot.rs`** - Screenshot capture service
- **`focus.rs`** - Window focus tracking
- **`events.rs`** - System event monitoring
- **`realtime.rs`** - Real-time update service

#### **React Frontend** (`src/`)

- **`App.tsx`** - Root component with theme provider
- **`Dashboard.tsx`** - Main dashboard component
- **`dashboard/`** - Individual dashboard sections
- **`hooks/useRealtime.ts`** - Real-time data management hook
- **`lib/theme-provider.tsx`** - Theme context and management

### **Database Schema**

- **`window_activities`** - Window focus/blur events
- **`time_logs`** - Session duration tracking
- **`screenshots`** - Screenshot metadata and paths
- **`audit_events`** - System events and errors

---

## 💻 Development

### **Project Structure**

```
soham-tracker/
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   └── types/             # TypeScript definitions
├── src-tauri/             # Rust backend
│   ├── src/               # Rust source code
│   ├── icons/             # Application icons
│   └── Cargo.toml         # Rust dependencies
├── public/                # Static assets
└── package.json           # Node.js dependencies
```

### **Development Commands**

```bash
# Start development server
npm run tauri dev

# Build for production
npm run tauri build

# Run frontend only
npm run dev

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### **Adding New Features**

1. **Backend (Rust)**

   - Add new Tauri commands in `src-tauri/src/lib.rs`
   - Implement database operations in `src-tauri/src/db.rs`
   - Update the database schema if needed

2. **Frontend (React)**
   - Create new components in `src/components/`
   - Add new hooks in `src/hooks/`
   - Update TypeScript types in `src/types/`

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **Code Style**

- Follow the existing TypeScript/React patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure all tests pass

### **Bug Reports**

Please use the [GitHub Issues](https://github.com/yourusername/soham-tracker/issues) page to report bugs. Include:

- Operating system and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Tauri Team** - For the amazing cross-platform framework
- **React Team** - For the powerful UI library
- **shadcn** - For the beautiful UI components
- **Vercel** - For the Next.js inspiration
- **Open Source Community** - For all the amazing libraries and tools

---

<div align="center">

**Made with ❤️ by the Soham Tracker Team**

[⭐ Star this repo](https://github.com/yourusername/soham-tracker) • [🐛 Report Bug](https://github.com/yourusername/soham-tracker/issues) • [💡 Request Feature](https://github.com/yourusername/soham-tracker/issues)

</div>
