#create a certificate

execute this commands into:
```
cd web-app-deploy/private

openssl req -x509 -newkey rsa:2048 -keyout keytmp.pem -out cert.pem -days 365

openssl rsa -in keytmp.pem -out key.pem
```\


TODO:
duplicati:

{"$group" : { "_id": "$email", "count": { "$sum": 1 } } },
{"$match": {"_id" :{ "$ne" : null } , "count" : {"$gt": 1} } },
{"$project": {"email" : "$_id", "_id" : 0} }

aggiungere pulsante per fare merge (solo admin)

rimuovere email con uppercase

TODO:

BONO CUSTOM ADDING TRATAMIENTOS (!!!)
BONO 1 sesiones maderoterapia - descuento promo
BONO 10 sesiones maderoterapia
Promiciones no se veen cuanda han caducato
remove phone duplicates

