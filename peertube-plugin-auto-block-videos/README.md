# Auto block videos plugin for PeerTube

Auto block videos based on public blocklists.

## Block lists

**Add your public list here**

## Blocklist URL format

This plugin expects the following JSON format from public blocklists:

```
{
  data: {
    value: string
    action?: 'add' | 'remove' // Default is 'add'
    updatedAt?: string // ISO 8601
  }[]
}
```

For example:

```
{
  data: [
    {
      value: 'https://framatube.org/videos/watch/37938234-ddf2-46d7-8967-8ac84820d5cd'
    },
    {
      value: 'https://peertube.cpy.re/videos/watch/f78a97f8-a142-4ce1-a5bd-154bf9386504',
      updatedAt: '2020-05-07T14:42:48.954Z'
    }
  ]
}
```

This plugin does not apply a diff, so if you want to remove an entity from the blocklist, add `action: 'remove'` to the object.

For example, to revert `https://peertube.cpy.re/videos/watch/f78a97f8-a142-4ce1-a5bd-154bf9386504` from the blocklist, update the JSON:

```
{
  data: [
    {
      value: 'https://peertube.cpy.re/videos/watch/f78a97f8-a142-4ce1-a5bd-154bf9386504',
      action: 'remove'
    },
    {
      value: 'https://framatube.org/videos/watch/37938234-ddf2-46d7-8967-8ac84820d5cd'
    }
  ]
}
```

The purpose of the `updatedAt` field is to not override admin blocks/unblocks:
 * Plugin auto block video A with an `updatedAt: '2020-05-07T14:42:48.954Z'`
 * Admin thinks this video is fine so it unblocks video A
 * On another check, the plugin won't re-block the account A because the `updatedAt` is before the last check
