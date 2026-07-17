# SwarmLab

Aplicación desplegada mediante Docker Swarm para demostrar escalabilidad y resiliencia.

## Arquitectura

- Frontend disponible en el puerto 8080.
- Backend configurado con 3 réplicas.
- Base de datos conectada al backend.
- Red overlay para comunicar los servicios.
- Recuperación automática de réplicas mediante Docker Swarm.

## Despliegue

docker stack deploy -c docker-compose.yml swarmlab

## Verificación

docker stack services swarmlab
docker service ps swarmlab_backend
docker network inspect swarmlab_swarm_overlay

## Aplicación

http://localhost:8080

## Prueba de resiliencia

Se detuvo manualmente una réplica del backend. Docker Swarm detectó la falla y creó automáticamente una nueva réplica para regresar al estado deseado de 3/3.
