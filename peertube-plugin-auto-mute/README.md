# Auto mute plugin for PeerTube

Auto mute accounts or instances based on public blocklists.

## Format

This plugins expect the following JSON format from public blocklists:

```
{
  data: {
    value: string
    action?: 'add' | 'remove' // Default is 'add'
  }[]
}
```

For example:

```
[
  {
    value: 'peertube.cpy.re'
  },
  {
    value: 'root@peertube.cpy.re'
  }
]
```

This plugin does not apply a diff, so if you want to remove an entity from the blocklist, add `action: 'remove'` to the object.

For example, to revert `peertube.cpy.re` from the blocklist, update the JSON:

```
[
  {
    value: 'peertube.cpy.re',
    action: 'remove'
  },
  {
    value: 'root@peertube.cpy.re'
  }
]
