List of things needing fixes/todo:
- ERROR LOGGING AND VIEWING!!!
- Make restore actually restore if the command is ran in the same discord as it was created in.
- Implement from Channel for Message Command
- Move Command Usage Params into own object for greater use of them.
- Add checks to make sure bot has the correct permissions before running the command(s). (ex: in prune command file)
- Add Discord Guild Channels to web UI.


Code Cleanup since all I did was keep mindlessly adding commands.


### Anything with @ts-ignore will need to be gone through and fixed.



Seperate Music from "BM [Web]"

express middleware "ensure" - Make sure arguemts are proper

URLS

GET:
	/auth/google
	/auth/google/callback
	/auth/discord
	/auth/discord/callback

	/dashboard
	/settings

	/bot/:id

	/discord/invite

	/music
	/music/:id


POST:
	/api
		/dashboard
			/status
			/create
		/bot
			/status
		/listener
			/status
			/create

# IO - Browser Send
 - bot-playing {  }
 - listen {  }

 - play-start {  }
 - play-stop {  }
 - play-next {  }

 - queue-toggle-repeat {  }
 - queue-clear {  }
 - queue-shuffle {  }
 - queue-item-remove {  }
 - queue-item-add {  }
 - queue-playlist {  }

# IO - Browser Receive
 - bot-playing { playing }
 - listen { serverId, playing, customPlaylist, playingFrom, repeatQueue, repeatSong }

 - play-start { err, nextSong, lastSong }
 - play-stop
 - play-next { err, nextSong, lastSong }

 - queue-toggle-repeat { value }
 - queue-clear
 - queue-shuffle {}
 - queue-item-remove { item }
 - queue-item-add { item }
 - queue-playlist { public_id }