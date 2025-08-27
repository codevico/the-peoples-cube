# The people's cube

Create a Magic: The Gathering [cube](https://mtg.fandom.com/wiki/Cube_Draft) by democratically voting on cards together with your friend group.

Start a poll on Telegram or Discord with `/propose <card name>`. After reaching the configured amount of votes the card will automatically be either approved or rejected.

# Requirements

- Node
- A [discord bot](https://discord.com/developers/docs/intro) and / or a [telegram bot](https://core.telegram.org/bots)

The current version of the people's cube can only be self hosted.

# Usage

1. Clone the repository
2. Create an `.env` file using `.env.example` as a base and paste your tokens
3. `npm run start`

# Commands

- `/propose <card name>`: starts a new poll
- `/cube stats`: prints some stats about the cube
- `/cube stats color`: prints a table with the color balance of the cube
- `/cube stats cmc`: prints a table with the cost balance of the cube

You have to register commands to discord in order for the bot to work. Since this operation is rate limited it has its own script, `npm run register-commands`. You only need to run this once.

# Web server

A web server can be exposed if configured. It currently supports two endpoints:

- `/list` - Returns a plaintext list of approved cards, one per row.
- `/json` - Returns a json array of all voted cards. Each card includes a property specifying whether it was approved or rejected.
