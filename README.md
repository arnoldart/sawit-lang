# 🌴 Sawit Lang

> **Secure Automation & Workflow Integration Tool**
> A modern backend-oriented programming language with automation as a first-class feature.

---

## 🚀 Overview

**Sawit Lang** adalah bahasa pemrograman yang dirancang untuk:

* Backend development
* Automation-first systems
* Workflow orchestration
* Lightweight scripting dengan performa scalable

Berbeda dengan bahasa seperti JavaScript atau Go, Sawit dibangun dengan filosofi:

> **“Automation is not a library, it's a language feature.”**

---

## ✨ Current Features (v0.1 - Prototype)

### 🧠 Core Language

* Variable declaration (`let`)
* Conditional (`if / else`)
* Expression system:

  * Arithmetic: `+ - * /`
  * Comparison: `< > <= >=`
  * Equality: `== !=`
* Parentheses support `( )`
* Block parsing `{ }`
* String & number support

---

### 🔥 Expression Example

```sawit
let x = 2 + 3 * 4
let y = (2 + 3) * 4

if x < y {
  print y
} else {
  print x
}
```

---

## ⚙️ Architecture

Saat ini Sawit menggunakan **interpreter berbasis TypeScript**:

```txt
.sawit → Lexer → Parser (AST) → Interpreter
```

### Components

* **Lexer** → mengubah source code menjadi token
* **Parser** → membangun AST (Abstract Syntax Tree)
* **Interpreter** → mengeksekusi AST

---

## 📂 Project Structure

```txt
src/
 ├── lexer.ts        # Tokenizer
 ├── parser.ts       # AST builder (recursive descent parser)
 ├── interpreter.ts  # Execution engine
 └── index.ts        # CLI entry
```

---

## ▶️ Getting Started

### Install dependencies

```bash
npm install
```

### Run Sawit file

```bash
npx ts-node src/index.ts test.sawit
```

---

## 🧪 Example File

```sawit
let saldo = 5000

if saldo < 10000 {
  print "Saldo rendah"
} else {
  print "Aman"
}
```

---

## 🧠 Design Principles

* Simple syntax (clean seperti Go)
* Explicit execution model
* Scalable parser architecture
* Automation-first mindset

---

## 🚧 Roadmap

### 🥇 Phase 1 — Core Language (Current)

* [x] Lexer
* [x] Parser (recursive descent)
* [x] Expression system (complete)
* [x] Interpreter
* [x] If / Else

---

### 🥈 Phase 2 — Language Features

* [ ] Function system (`fn`, `return`)
* [ ] Scope & environment improvement
* [ ] Boolean type (`true`, `false`)
* [ ] Logical operators (`&&`, `||`)
* [ ] Error handling system

---

### 🥉 Phase 3 — Automation Engine (🔥 Signature Feature)

* [ ] Scheduler

```sawit
every 10s {
  run_job()
}
```

* [ ] Event system

```sawit
on user_login {
  log_activity()
}
```

* [ ] Background jobs

```sawit
job send_email {
  retry 3
}
```

---

### 🚀 Phase 4 — Compiler

#### Step 1: JS Compiler

```txt
.sawit → AST → JavaScript → Node.js
```

#### Step 2: Native Compiler (Advanced)

* LLVM integration (via LLVM)
* Target: performa setara Rust / C

---

## 🔥 Vision

Sawit bertujuan menjadi:

> **Backend language with native automation capabilities**

Bukan sekadar bahasa scripting, tapi:

* Rule engine
* Workflow engine
* Automation platform

---

## 🌴 Philosophy

Nama “Sawit” merepresentasikan:

* 🌱 Growth (bertumbuh dan scalable)
* ⚙️ Productivity (efisien & powerful)
* 🔄 Versatility (multi-use: backend, automation, scripting)

---

## 🤝 Contributing

Saat ini masih dalam tahap prototype.
Contribution & ide sangat terbuka untuk:

* syntax improvement
* performance optimization
* automation design

---

## 📌 Status

> 🚧 Experimental (actively developed)

---

## 💬 Author Note

Project ini dimulai sebagai eksplorasi:

* language design
* compiler fundamentals
* backend automation systems