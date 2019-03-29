# Bot Manager
A Global Bot Manager for Discord, soon to be twitch, and the rest of the world.


## Installing

```bash
npm install             # Installs all the package.json dependencies.
npm install -g nodemon  # I use it for my development you can replace it with node it in package.json
npm run build:full      # Builds typescript and corrects @ paths
```


## Running

To Run the Discord bots you need to have the master started.

```bash
npm run discord_master  # Used so the main bot and music bot can "talk" to eachother.
```

Now, you can launch both of these discord bots.

```bash
npm run discord_bot     # Starts the main discord bot for commands/intervals.
npm run discord_music   # Starts the music (audio) portion of the bot so the main bot can be updated at any point.
```

To start the main programs

```bash
npm run grabber    # Starts the main RSS/Twitter Grabber for Discord.
npm run website    # Starts the website
```