# Auto mute plugin for PeerTube

Auto mute accounts or instances based on public blocklists.

## Mute lists

**Add your public list here**

 * https://peertube_isolation.frama.io/list/peertube_isolation.json by [@PeerTube_Isolation](https://cornichon.me/@PeerTube_Isolation)

## Settings

You can choose to expose your mute list that will be available on `https://example.com/plugins/plugins/auto-mute/router/api/v1/mute-list`.
Other instances can follow your mute list, but muting removal is not supported yet. For example, if you subscribe to the mute list of `example.com`:
 * `example.com` mutes `account1`
 * Your instance automatically mutes `account1`
 * `example.com` unmutes `account1`
 * You instance **will not** unmute `account1`

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
      value: 'peertube.cpy.re'
    },
    {
      value: 'root@peertube.cpy.re'
    },
    {
      value: 'chocobozzz@peertube2.cpy.re',
      updatedAt: '2020-05-07T14:42:48.954Z'
    }
  ]
}
```

This plugin does not apply a diff, so if you want to remove an entity from the blocklist, add `action: 'remove'` to the object.

For example, to revert `peertube.cpy.re` from the blocklist, update the JSON:

```
{
  data: [
    {
      value: 'peertube.cpy.re',
      action: 'remove'
    },
    {
      value: 'root@peertube.cpy.re'
    }
  ]
}
```

The purpose of the `updatedAt` field is to not override admin mutes/unmutes:
 * Plugin auto mutes account A with an `updatedAt: '2020-05-07T14:42:48.954Z'`
 * Admin thinks this account is fine so it unmutes account A
 * On another check, the plugin won't re-mute the account A because the `updatedAt` is before the last check
