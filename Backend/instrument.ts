import tracer from 'dd-trace';
tracer.init({ 
  appsec: true,
  env: 'development',
  service: 'joyeria-diana-laura-backend',
  hostname: 'localhost',
  port: 8126
});