# PeerTube video annotation

Add a field in the video form so users can set annotation to their video.

![](https://lutim.cpy.re/n7mWsZrz.png)

By default, the annotation will be on the top-right of the player.

Annotations format:

```
start --> stop
options: align=top-left (or top, top-right, right, bottom-right, bottom, bottom-left, left)
HTML
```

  * `start` (in seconds): When to show the annotation
  * `stop` (in seconds): When to hide the annotation
  * `options: ...` (this line is optional): Set options for your annotation
  * `HTML`: Content of your annotation

For example:

```
 --> 4
Hello, how are you?

5-->10
See <a href="https://cpy.re" target="_blank">this document</a> for more information

12-->
options: align=top-left
This annotation will be at the top-left of the player
```
