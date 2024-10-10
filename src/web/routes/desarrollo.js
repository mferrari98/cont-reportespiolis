const express = require('express');
const WebSocket = require('ws');

const router = express.Router();
const HistLectControl = require("../../control/controlHistoricoLect");

const histLectControl = new HistLectControl();

const whitelist = ['localhost', "127.0.0.1", "10.10.4.125", "10.10.3.22"]

// Middleware para validar el host
function validateHost(req, res, next) {
  
  const host = req.ip.split(":")[3]  

  if (whitelist.includes(host)) {
    // Si el host está en la lista blanca, permite la solicitud
    next();
  } else {
    // Si el host no está permitido, responde con un error
    res.status(403).json({ message: 'Host no autorizado' });
  }
}

// Middleware global para todas las rutas en este router
router.use(validateHost);

router.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Pantalla de Bienvenida</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
          }          
          p {
            font-size: 18px;
            color: #555;
          }
          .warning {
            color: red;
            font-weight: bold;
          }
          img {            
            margin-left: auto;
            margin-right: auto;
            margin-top: 20px;
            width: 600px; /* Ajusta el tamaño de la imagen */
          }
        </style>
      </head>
      <body>
        <h2>Bienvenido entusiasta</h1>
        <p>Estás en el endponit de desarrollo</p>
        <p class="warning">Ojota con /truncar y /poblar</p>
        <img src="/git-pull.webp">
      </body>
    </html>
  `);
});

router.get('/sinc', (req, res) => {

  histLectControl.sincronizar((cantidad) => {
    res.json({ message: `tu servidor trajo ${cantidad} de datos a revisar desde servidor de referencia`});
  })
});

router.get('/soquete', (req, res) => {

  const puertoWS = 8081;
  const wss = new WebSocket.Server({ port: puertoWS });

  wss.on('connection', (ws) => {
    console.log(`${ID_MOD} - Cliente conectado para sincronización`);
    
    ws.on('message', (message) => {
      console.log(`${ID_MOD} - Recibido comando SQL: ${message}`);

      // Aquí puedes ejecutar el SQL que envía el cliente
      // db.run(message, [], (err, result) => {
      //    ws.send(JSON.stringify(result)); // Enviar el resultado de vuelta
      // });
    });

    ws.on('close', () => {
      console.log(`${ID_MOD} - Cliente desconectado`);
    });
  });

  // Responder al cliente con el puerto en el que está esperando el WebSocket
  res.json({ message: 'El servidor está listo para sincronización', puerto: puertoWS });
});

router.get('/poblar', (req, res) => {

  if (true)
    res.json({ message: 'por seguridad esta funcion esta anulada' });
  else
    histLectControl.poblar((resultado) => {
      res.json({ message: 'poblando base de datos', resultado });
    })
});

router.get('/truncar', (req, res) => {

  if(true)
    res.json({ message: 'por seguridad esta funcion esta anulada' });
  else
    histLectControl.truncate((resultado) => {
      res.json({ message: 'vaciando bd', resultado });
    })
});

module.exports = router