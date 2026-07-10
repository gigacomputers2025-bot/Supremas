# Deploy en Fly.io — Supremas

## Requisitos

1. Cuenta en [fly.io](https://fly.io)
2. Git instalado
3. flyctl (CLI de Fly)

## Instalación de flyctl

```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

## Login

```bash
fly auth login
```

## Crear volumen persistente (solo la primera vez)

```bash
fly volumes create supremas_data --region gru --size 1
```

Usá `gru` para Buenos Aires, `iad` para USA, `ams` para Amsterdam.

## Deploy

```bash
fly deploy
```

Esto tarda 2-3 minutos en la primera vez.

## Ver la app

```bash
fly open
```

## Actualizar después de cambios

```bash
git add .
git commit -m "cambios"
fly deploy
```

## Backup manual de la DB

```bash
fly ssh console -C "cat /data/supremas.db" > supremas-backup.db
```

## Notas importantes

- **Free tier:** La VM se duerme después de ~15-30 minutos sin tráfico. Al recibir una request, despierta en ~5-10 segundos.
- **Persistencia:** La base de datos vive en el volumen `/data` y NO se pierde al redeployar ni al reiniciar.
- **Límites free:** 3 VMs compartidas, 256MB RAM c/u, 1-3 GB transferencia/mes.
- **Backup del Excel:** Usá "Exportar Excel" desde la app para descargar todos los datos.

## Solución de problemas

| Problema | Solución |
|---|---|
| `fly launch` falla porque la app ya existe | Ya existe — simplemente ejecutá `fly deploy` directamente |
| La app no responde | `fly logs` para ver errores |
| Error de volumen al hacer deploy | `fly volumes create supremas_data --region gru --size 1` |
| Se perdió la DB | Si el volumen existe, la DB está ahí. Verificar con `fly ssh console -C "ls -la /data/"` |
