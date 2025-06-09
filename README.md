# Certificate Skins - noskid.today

![togp thing](https://togp.xyz?owner=douxxtech&repo=skins.noskid.today&theme=json-dark-all&cache=false)

We dont like boring certificates.

Spice up your noskid.today certificates with custom skins! Based on the main [noskid.today](https://noskid.today) certificate but for making your certs look cooler.

> [!TIP]
> Do you want to contriburte to skins.noskid.today ? check out [contribute.md](contribute.md)



> [!NOTE]
> This tool is hosted at [skins.noskid.today](https://skins.noskid.today) !  
> Upload your cert, pick a skin, download. Easy
>  
> [![NoSkid Verification](https://noskid.today/badge/100x30/?repo=douxxtech/skins.noskid.today)](https://noskid.today)

## What does this do?

Simple: you upload your noskid certificate, choose a fancy skin, and get a cooler looking version. The certificate still works for verification and everything, just looks way better.

## Hosting this thing

> [!TIP]
> You need `librsvg2-bin` installed to convert SVGs to PNGs. PHP needs to be able to use exec() too

It's a php-dependent site, just like the main noskid.today.

Installation: 
```shell
git clone https://github.com/douxxtech/skins.noskid.today
cd certificate-skins
sudo apt install librsvg2-bin  # if you're on ubuntu/debian
php -S 0.0.0.0:80
```
(or use apache/nginx like a normal person)

## How it works

1. You upload your noskid cert (PNG only, max 500KB)
2. Pick a skin from the gallery
3. It checks if your cert is legit via the noskid.today API
4. Generates your custom cert with the skin applied
5. Downloads automatically

The verification key gets embedded in the PNG metadata so it's still a valid noskid certificate.

## Making custom skins

Throw SVG files in the `/skins/` folder. Use these placeholders:
- `{{DATE}}` for the cert date
- `{{CERTNB}}` for certificate number  
- `{{PERCENT}}` for the score
- `{{USER}}` for username

Example:
```svg
<text>Certificate #{{CERTNB}} - {{USER}} scored {{PERCENT}}%</text>
```

## Discord webhook (optional)

Want notifications when someone generates a cert? Set this in index.php:
```php
DEFINE('DISCORD_WEBHOOK_URL', 'your-webhook-url');
```
## Yapyap

Licensed under the same license as the main project.
=> [NSDv1.0 LICENSE](LICENSE)

Thanks to the noskid.today [contributors](https://github.com/douxxtech/noskid.today/graphs/contributors) for making the original thing that this builds on <3

<a align="center" href="https://github.com/douxxtech" target="_blank">
<img src="https://madeby.douxx.tech"></img>
</a>