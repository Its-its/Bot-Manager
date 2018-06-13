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