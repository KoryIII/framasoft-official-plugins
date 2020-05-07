# Auto mute plugin for PeerTube

Auto mute accounts or instances based on public blocklists.

## Settings

![settings screen](https://lutim.cpy.re/qaFui9N1.png)

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
