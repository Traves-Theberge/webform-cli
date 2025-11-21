# WebForm CLI

<div align="center">

![WebForm CLI Logo](https://img.shields.io/badge/WebForm-CLI-blue?style=for-the-badge&logo=node.js)

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-%5E5.0.0-blue.svg)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/badge/npm-1.0.0-red.svg)](https://www.npmjs.com/package/webform-cli)

**Extract and transform web data with ease using AI-powered schemas.**

</div>

## 🌟 Overview

WebForm is a command-line tool that combines web scraping with AI-powered data formatting. It allows you to extract unstructured data from websites using customizable schemas and process it using Google's Gemini language model and output the structured schema.

## NOTE FROM DEVELOPER 

Please read the TERMS.MD - This is an experimental CLI TOOL.

### Key Features

- 🔍 **Smart Extraction**: Extract data from any website using CSS selectors
- 🤖 **AI-Powered Formatting**: Process extracted data with Google's Gemini LLM
- 📋 **Schema-Driven**: Create reusable data extraction patterns with 10 built-in schemas
- 📊 **Flexible Output**: Export as JSON or formatted text
- 🔒 **Secure**: Input validation and secure API key storage
- 🤝 **Ethical Scraping**: Built-in robots.txt compliance and rate limiting
- ⚙️ **Customizable**: Extend with your own schemas
- 🛠️ **Interactive Setup**: Easy configuration wizard for first-time users

## 📦 Installation

### Prerequisites

- Node.js >= 18.x
- npm or yarn

### Global Installation

```bash
npm install -g webform-cli
```

### Local Installation

```bash
# Clone the repository
git clone https://github.com/Traves-Theberge/webform-cli.git

# Navigate to project directory
cd webform-cli

# Install dependencies
npm install

# Build the project
npm run build

# Create a symlink for local development
npm link
```

## 🚀 Quick Start

### 1. Initial Setup

Run the interactive setup wizard to configure your API key:

```bash
webform setup
```

Or set it directly:

```bash
webform setup --api-key YOUR_GOOGLE_AI_API_KEY
```

### 2. Basic Usage

Extract data from a webpage using a predefined schema:

```bash
webform scrape https://example.com --schema article
```

Process with Gemini LLM and save to a file:

```bash
webform scrape https://example.com --schema product --llm-output --save output.json
```

### Available Commands

| Command | Description |
|---------|-------------|
| `setup` | Interactive setup for API key and model configuration |
| `scrape` | Extract data from a URL using a schema |
| `schema list` | List all available schemas |
| `schema view` | View a specific schema definition |
| `config set` | Configure settings like API keys |
| `test` | Test extraction without using the LLM |
| `help` | Display help information |

## 📋 Schemas

Schemas define what data to extract and how to structure it. WebForm comes with 10 built-in schemas:

- **article**: For news and blog articles
- **blog-post**: For blog posts with author, categories, and tags
- **product**: For e-commerce product pages
- **ecommerce**: For e-commerce products with reviews and specifications
- **github-repo**: For GitHub repository pages
- **job-listing**: For job postings with salary and requirements
- **reddit-post**: For Reddit posts with score and comments
- **documentation**: For technical documentation pages
- **real-estate**: For property listings
- **default**: General-purpose schema

### Example Schema (article.json)

```json
{
  "selectors": {
    "title": ".athing:first-of-type .titleline > a",
    "url": ".athing:first-of-type .titleline > a",
    "score": ".athing:first-of-type + tr .score",
    "user": ".athing:first-of-type + tr .hnuser",
    "age": ".athing:first-of-type + tr .age a",
    "comments": ".athing:first-of-type + tr a:contains('comments')",
    "rank": ".athing:first-of-type .rank"
  },
  "structure": {
    "title": {
      "type": "string",
      "description": "The article title",
      "nullable": false
    },
    "url": {
      "type": "string",
      "description": "The URL of the article",
      "nullable": true
    },
    "score": {
      "type": "string",
      "description": "Article score",
      "nullable": true
    }
    // ... more fields
  }
}
```

### Creating Custom Schemas

Create your own schemas as JSON files in the `schemas/` directory:

```json
{
  "selectors": {
    "fieldName": "css-selector"
  },
  "structure": {
    "fieldName": {
      "type": "string|number|boolean|array|object",
      "description": "Field description",
      "nullable": true|false
    }
  }
}
```

## ⚙️ Configuration

WebForm requires configuration for API keys. Create a `.webformrc.json` file in your home directory:

```json
{
  "gemini_api_key": "YOUR_GOOGLE_AI_API_KEY"
}
```

Alternatively, set environment variables in a `.env` file:

```
GOOGLE_AI_API_KEY=your_api_key_here
GOOGLE_AI_MODEL=gemini-2.0-flash
```

## 🔧 Advanced Usage

### Structured Output

Extract data with schema validation:

```bash
webform scrape https://example.com --schema product --structured
```

### Custom Output Format

```bash
webform scrape https://example.com --schema article --output text
```

### Extract Without AI Processing

```bash
webform test https://example.com --schema article
```

## 📘 Examples

### Scraping Hacker News

```bash
webform scrape https://news.ycombinator.com --schema article
```

Output:
```json
{
  "title": "Understanding Machine Learning: From Theory to Algorithms",
  "url": "https://www.cs.huji.ac.il/~shais/UnderstandingMachineLearning/copy.html",
  "score": "105 points",
  "user": "Anon84",
  "age": "2 hours ago",
  "comments": "20",
  "rank": "1."
}
```

### Scraping Product Information

```bash
webform scrape https://example-store.com/product/123 --schema product
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT - see the LICENSE file for details.


---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Traves-Theberge">Traves Theberge</a></sub>
</div>
