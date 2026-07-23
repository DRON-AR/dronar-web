import fastify from 'fastify';
import server from './server';

const app = fastify();

app.register(server);

export default async function handler(req, res) {
  await app.ready();
  app.server.emit('request', req, res);
}
