# Node-RED node for send command and tts to Yandex Alice

The original repo is owned by [@AntonTumilovich](https://github.com/AntonTumilovich/https-flows.nodered.org-node-node-red-contrib-yandex-alice-command)

The original npm module is [node-red-contrib-yandex-alice-command](https://www.npmjs.com/package/node-red-contrib-yandex-alice-command)

## Nodes

-   alice-send Send voice command or text to speach to any Yandex.Alice speakers.

## Examples

-   https://www.youtube.com/watch?v=kY6g7x9B-PU
-   https://www.youtube.com/watch?v=ldF4b11SaiQ

## Installation

```
npm install @ksrt12/node-red-yandex-alice-command
```

or clone repo to any place and then

```
npm install *full path to cloned repo folder*
```

## Changelog

Version 2.1.0 18/12/23:

-   Use built-in node fetch instead of external module

Version 2.0.5 01/10/22:

-   Catch authorization error

Version 2.0.4 27/04/22:

-   Move some code to separate files
-   Rewrite some functions as classses
-   Write index.js

Version 2.0.3 17/04/22:

-   Define some types
-   Fix undefined var cookies in getCookies
-   Update Chrome UserAgent

Version 2.0.2 14/04/22:

-   Move some code out of async function
-   Clean index.d.ts

Version 2.0.1 14/04/22:

-   Add activation check
-   Const-ify code

Version 2.0.0 14/04/22:

-   Rewrite using node credentials
-   Move common functions to separate files
-   Clean

Version 1.1.7 28/03/22:

-   Fix cookies generation
-   Rewrite exception handling
-   Rewrite topics handling

Version 1.1.6 27/03/22:

-   Fix login authorization
-   Rewrite update logic
-   Rewrite docs help

Version 1.1.5 22/03/22:

-   Fix some logic

Version 1.1.4 23/03/22:

-   Drop useless speaker name
-   Rewrite logs logic

Version 1.1.2 22/03/22:

-   Save previous node state

Version 1.1 19/03/22:

-   Use node-fetch instead of deprecated request-promise

Version 1.0.20 12/03/22:

-   Fixed for scenario new API

Version 1.0.19 11/05/21:

-   Fixed spec chars in password

Version 1.0.18 18/03/21:

-   Fixed for scenario new API

Version 1.0.17 27/11/20:

-   Fixed speaker not in room

Version 1.0.15 05/08/20:

-   Fixed for new Yandex Alice API

Version 1.0.14 19/06/20:

-   Changed Get cookies procedure, now not needed get token

Version 1.0.12 16/06/20:

-   Added Separator sybmol ; or , or |

Version 1.0.10 16/06/20:

-   Added Send to selected speakers: speaker_id and speaker_name as list separated by sybmol ;

Version 1.0.8 15/06/20:

-   Added Send to All speakers or to selected speaker

Version 1.0.7 15/06/20:

-   Fixed Get token with pasword that include special chars

Version 1.0.5 14/06/20:

-   Added Alice icon
-   Added Debug option in login page
-   Added Status messages
-   Fixed Set node name

Альтернативный способ получения Cookies:

1. Зайти на https://yandex.ru/quasar/iot
2. Открыть панель разработчика
3. Найти запрос к странице и там взять отправленные cookies
   <img src="http://wiki.swiitch.ru/images/6/66/Node_red_yandex_alice_get_cookies_alt.png">
