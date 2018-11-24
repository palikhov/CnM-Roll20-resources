These files are for use with Roll20 Enhancement Suite's new animated background feature.

As time allows there will a composite list of various animated background files, their 'theme' and content. While there are a couple key places to find animated battlemaps; the animated backgrounds should be of `.webm` or `.mp4` video type, and stored somewhere both you and your players (who must also be running the addon) can access. So saving the youtube video on your local machine or behind a paywall/password wont' work.

# How to enable an Animated Background

Look for the ![Player Configuration](https://image.ibb.co/mP0yeq/Icon.png) animation configutation icon. *(located near the top left corner by the Roll20 Toolbar)*

Which when chicked opened will show... 

![Player Configuration](https://image.ibb.co/heMFQV/Background-Setup.png)

You will need to insert a valid media URL...



# How to generate a usable media URL link from an existing site. 

### Usable Media URLs from Online sources

*This requires VLC player*


Open **VLC**
Choose `Media`
Choose `Open Network Stream`
Choose `Network`
Enter the URL / Link to the video (such as `https://www.youtube.com/watch?v=ahwMlwJXPPs`)

Then in the menu at the top clik on `Tools`
Choose `Media Information` (or `Ctrl + i`)
At the bottom, under location - you can triple click on that to copy a direct link to the video
(It will be a very large string of letters and numbers)
example

```
https://r6---sn-5uaeznzk.googlevideo.com/videoplayback?id=o-ADXSkzdDq8RM-Jn5ObZi6JGV0TkYkmusF3YAvA8l_ncv&c=WEB&expire=1541603400&ipbits=0&pl=26&signature=1E2D2BE185FA6F00216100BED0C3D2C5AA2E903B.C97AAFE29C396824C2404ACE4AA6DFE19127BC5F&mime=video%2Fmp4&requiressl=yes&ip=2601%3Ac6%3A8302%3Ad600%3A7c52%3A7b49%3A52d0%3A948d&mt=1541581677&fvip=4&key=yt6&sparams=dur%2Cei%2Cid%2Cinitcwndbps%2Cip%2Cipbits%2Citag%2Clmt%2Cmime%2Cmm%2Cmn%2Cms%2Cmv%2Cpl%2Cratebypass%2Crequiressl%2Csource%2Cexpire&ms=au%2Conr&itag=22&lmt=1494324191606141&dur=10800.065&mv=m&ratebypass=yes&source=youtube&initcwndbps=1885000&mn=sn-5uaeznzk%2Csn-vgqsknez&mm=31%2C26&ei=6KviW6eYBYq2j-8PsK2k-As
```

### Where you can host your own videos

To a limited degree `http://imgur.com` will work as a place for animated content.
The tool does NOT work with animated `gif` formated images, but does with `.webm` and most `.mp4`

Example
This will not work
```https://i.imgur.com/JrZZAqH.gifv ```

But this likely will
```https://i.imgur.com/JrZZAqH.mp4```

The issue being the link must lead to the Video - directly, not be interpreted for a site resident video playing app or the like.



### Github File Repository

You can test the features by using a **Media URL** for a location local to you, or that you have access to, but in general the Media URL needs to an address that *anyone* can use without passwords.

In this directory several files have been provided for you to test or use.

In general to get use the files in this Git to work within the tool, append the `file name` <example : `darklake_vortex-gridless.webm` >

to the base `URL`: which should be `https://raw.githubusercontent.com/DMsGuild201/Roll20_resources/master/ExternalArt/Animated/`

So for that file name example:  base `URL` + `File name`=

`https://raw.githubusercontent.com/DMsGuild201/Roll20_resources/master/ExternalArt/Animated/darklake_vortex-gridless.webm`

Sources for animated backgrounds

- [Listing by Filename](https://github.com/DMsGuild201/Roll20_resources/blob/master/ExternalArt/Animated/By%20filename.MD)

- [Listing by Artist & Set](https://github.com/DMsGuild201/Roll20_resources/blob/master/ExternalArt/Animated/Listing%20by%20Artist%20n%20Set.MD)

- [By seachable theme/features etc](https://docs.google.com/spreadsheets/d/1CmYvfdu4lUNXEKWUoCqgTMlUd_UXYb-0N-GSqLsZF-M/edit#gid=0)


##### Also...

- [Dooley's Map and Game Emporium](https://dmge.net/library) *I honestly don't like this, but it has potenetial if they ever update it.*



# Artists Attribution (where you can go to support )


## Dynamic Dungeons 

artist:

youTube Playlist: https://www.youtube.com/channel/UCaiH6M0BgtupcNcDisrJySw/videos

Patreon: https://www.patreon.com/dynamicdungeons





## Tabletop Things

artist: Tom Swogger

Site: https://www.tabletopthings.com/

youTube: https://www.youtube.com/c/TomSwogger






### Manny Sykes

artist: Manny Sykes

youTube Playlist: https://www.youtube.com/channel/UCrsCjHT8tJ1vpSkvLoYji3g/videos

###### Note: many of these maps are relative small and do not lend themselves easily to battlemaps as their visual elements often suggest a scale of the image is ~30ft across. For outdoor landscape, this is problematic for many battlemaps.


# How to make your own Animated Backgrounds:

Manny Sykes uses this tool to create many of his animated backgrounds, and you can too.  DMGE is tool offered by /u/mcdoolz through his [Patreon site](https://www.patreon.com/dmge).

- You find a game with a virtual enviroment you enjoy
- confirm there is a 'no clipping' sort of crack or feature.
- use a software for recording the screen.
- then... post the video onto Imgur; YouTube; etc etc.
- use the same practices as above to generate a usable link.


[Watch this](https://www.youtube.com/watch?v=Uu10ZamLWHo) to help walk you through the process

