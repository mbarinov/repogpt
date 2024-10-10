# RepoGPT: AI-Powered GitHub Assistant 🚀

[![License](https://img.shields.io/github/license/mbarinov/repogpt)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/mbarinov/repogpt)](package.json)
[![Contributors](https://img.shields.io/github/contributors/mbarinov/repogpt)](https://github.com/mbarinov/repogpt/graphs/contributors)

**RepoGPT** is an open-source, AI-powered assistant that revolutionizes how developers interact with their GitHub repositories. By leveraging natural language processing, it simplifies codebase exploration and management, providing intelligent insights to make development more efficient and intuitive.

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features ✨

- **AI-Driven Repo Interaction** – Chat with your repositories using natural language to get insights, generate documentation, or receive code suggestions.
- **Streamlined Repo Management** – Import, list, and delete repositories effortlessly within the application.
- **PostgreSQL + pgvector Integration** – Built for efficient AI-powered data processing and storage.
- **Simple Setup** – Get up and running in minutes with minimal configuration.

## Demo 🎥

Here's a look at RepoGPT in action:

### Chat with your GitHub repository:

![Chat with Repo](https://storage.googleapis.com/aithelete/chat.png)

### Manage repositories:

![Manage Repos](https://storage.googleapis.com/aithelete/repos.png)

## Getting Started 🚀

Follow these instructions to get a copy of RepoGPT up and running on your local machine for development and testing purposes.

## Prerequisites 🛠️

Before starting, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (preferred package manager)
- [Docker](https://www.docker.com/) (for database setup)
- [PostgreSQL](https://www.postgresql.org/) with the [pgvector extension](https://github.com/pgvector/pgvector)
- [OpenAI API Key](https://platform.openai.com/) (for AI functionalities)

## Installation Guide 📦

### 1. Clone the Repository

```bash
git clone https://github.com/mbarinov/repogpt.git
cd repogpt
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up PostgreSQL with pgvector

To leverage AI capabilities, RepoGPT uses PostgreSQL with the pgvector extension. Use Docker to set up the database:

```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=repogpt \
  -p 5432:5432 \
  ankane/pgvector
```

### 4. Configure Environment Variables

Create a `.env` file in the project root directory and set the following variables:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/repogpt
```

### 5. Initialize the Database Schema

Use Prisma to push the necessary database schema:

```bash
npx prisma migrate dev
```

### 6. Build and Start the Application

To build and start the app, run:

```bash
pnpm build
pnpm start
```

### 7. Access the Application

Once running, the app will be available at [http://localhost:3000](http://localhost:3000). You can now start managing and interacting with your repositories via RepoGPT.

## Usage 📝

### Import Your First Repository

Use the following command to import a repository:

* Set the OpenAI API key and Github Access Token. http://localhost:3000/settings
* Navigate to the **Repositories** section. http://localhost:3000/repositories
* Fill in the repository URL, repository branch name and click on the **Import** button.
* The repository will be imported and available for interaction in a few minutes.


### Interact with Your Repository

- Navigate to the **Chat** section to start a conversation with your codebase.
- Ask questions like "How is the authentication implemented?" or "List all the endpoints in the API."

## Roadmap 🛣️

- [ ] **LangChain AI ReAct Agent Integration** – Incorporate LangChain's ReAct Agent for deeper analysis.
- [ ] **Enhanced GitHub Integration** – Improve interaction with GitHub APIs for more seamless operations.
- [ ] **Support Ollama local models** – Enable integration with Ollama's 
  local models for AI capabilities.
- [ ] **Support for Other VCS** – Integrate with other version control systems like GitLab and Bitbucket.

## Contributing 🤝

We love contributions! Please check out our [Contributing Guide](CONTRIBUTING.md) to get started.

## Support 📫

- **Issues** – Feel free to [open an issue](https://github.com/mbarinov/repogpt/issues) if you encounter any problems.
- **Discussions** – Join our [GitHub Discussions](https://github.com/mbarinov/repogpt/discussions) for questions and community support.
- **Email** – For any other inquiries, contact us at [me@maxbarinov.com].

## License 📝

This project is licensed under the [MIT License](LICENSE).

---

*Made with ❤️ by [Max Barinov](https://maxbarinov.com)*

---

### Keywords

AI-powered GitHub assistant, natural language repo management, open-source, developer tools, machine learning, codebase exploration, pgvector, PostgreSQL, OpenAI.

---


[![Star History Chart](https://api.star-history.com/svg?repos=mbarinov/repogpt&type=Date)](https://star-history.com/#mbarinov/repogpt&Date)
