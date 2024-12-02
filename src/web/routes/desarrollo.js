const express = require('express');
const path = require('path');
const WebSocket = require('ws');

const router = express.Router();

const { logamarillo } = require("../../control/controlLog")
const { getDescripcion } = require('../../control/servicioDescripciones');

const HistoricoLecturaDAO = require("../../dao/historicoLecturaDAO");
const historicoLecturaDAO = new HistoricoLecturaDAO();

const HistLectControl = require("../../control/controlHistoricoLect");
const histLectControl = new HistLectControl();

const ID_MOD = "DESA"

const whitelist = ['localhost', "127.0.0.1", "10.10.4.125", "10.10.3.22"]

// Middleware para validar el host
function validateHost(req, res, next) {

  /*
  antes funcionaba con esto 
  const host = req.ip.split(":")[3]
  no me explico que paso
  */
  const host = req.socket.remoteAddress.split(":")[3]
  
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
  const filePath = path.join(__dirname, '..', 'public', 'desa.html');
  res.sendFile(filePath);
});

router.get('/omelet', (req, res) => {
  const filePath = path.join(__dirname, '..', 'public', 'omelet.html');
  res.sendFile(filePath);
});

router.get('/log', (req, res) => {
  const filePath = path.join(process.cwd(), 'historico.txt');
  res.sendFile(filePath);
});

router.get('/sinc', (req, res) => {

  histLectControl.sincronizar(req.socket.localPort, (cantidad) => {
    res.json({
      message: `
      tu servidor trajo esto
      ${cantidad}
      desde servidor de referencia
      `
    });
  })
});

router.get('/soquete', (req, res) => {

  const puertoWS = 8081;
  const wss = new WebSocket.Server({ port: puertoWS });

  wss.on('connection', (ws) => {
    logamarillo(3, `${ID_MOD} - (WS-SRV) Cliente conectado para sincronización`);

    ws.on('message', (message) => {
      logamarillo(3, `${ID_MOD} - (WS-SRV) recibiendo cmd "${message}"`);
      
      ws.send(JSON.stringify("querias cumbia? toma!"));
      ws.close()
    });

    ws.on('close', () => {
      logamarillo(3, `${ID_MOD} - (WS-SRV) Cliente desconectado`);
    });
  });

  // Responder al cliente con el puerto en el que está esperando el WebSocket
  res.json({ message: 'El servidor está listo para sincronización', puerto: puertoWS })
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

  if (true)
    res.json({ message: 'por seguridad esta funcion esta anulada' });
  else
    histLectControl.truncate((resultado) => {
      res.json({ message: 'vaciando bd', resultado });
    })
});

router.get('/curar/:seg', (req, res) => {

  const { seg } = req.params;  

  historicoLecturaDAO.listParaCurar(seg, (resultado) => {
    res.json({ message: 'datos para curar', resultado });
  })
});

router.get('/tooltip/:nombre', (req, res) => {

  const { nombre } = req.params;
  const tooltipText = getDescripcion(nombre);
  
  res.send(tooltipText);
});

module.exports = router