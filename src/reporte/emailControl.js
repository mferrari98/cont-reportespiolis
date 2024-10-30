const config = require("../../config.json")
const { logamarillo } = require("../control/controlLog")

const fs = require('fs');
const nodemailer = require('nodemailer');
const dns = require('dns');

const ID_MOD = "CTRL-EMAIL"

let destinos = config.email.difusion
let user = config.email.credenciales.user
let pass = config.email.credenciales.pass

let transporter
const smtpHostFallback = "10.10.1.40"; // Dirección IP alternativa si no se puede resolver el host
const smtpHost = 'post.servicoop.com';

/*
Configuración del transporte SMTP
es importante entender que SMTP se usa para enviar mensajes unicamente, es decir no se usa
para recibir mensajes.
por otro lado, en caso de enviar mensajes debe utilizarse POP3 (mas viejo) o IMAP.
*/
function createTransporter(host) {
    return nodemailer.createTransport({
        host: host,
        port: 25,
        auth: {
            user: user,
            pass: pass
        },
        tls: {
            rejectUnauthorized: false // omitir verificación en cadena
        }
    });
}

function EmailControl() { }

EmailControl.prototype.enviar = function () {

    const { date, time } = getCurrentDateTime();

    // Enviar el correo
    let resumen = "Para datos historicos →"
    let htmlContent = fs.readFileSync('./src/reporte/salida/tabla.html', 'utf8');

    let mailOptions = {
        from: "<comunicaciones.servicoop@servicoop.com>",
        to: destinos,
        subject: `Reporte de agua potable ${date} ${time}`,
        text: resumen,
        html: `
            ${resumen}            
            <a href="https://10.10.3.50:3000/reporte" style="color: blue;">
                🌐 <b>ver online</b> 
            </a>            
            ${htmlContent}
            <div style="text-align: center;">
                <img src="cid:grafBarras" alt="Grafico de Barras"/>

                <div style="text-align: center; font-family: 'consolas'; margin: 25px 0px; font-size: 18px;">
                    Volúmenes y Porcentajes de agua en m3
                </div>                    

                <img src="cid:grafPieMdy" alt="Grafico Pie Madryn"/>
                <img src="cid:grafPieTw" alt="Grafico Pie Trelew"/>

                <img src="cid:grafLineas" alt="Grafico de Lineas"/>
            </div>
            `,
        attachments: [
            {
                filename: 'imagen.jpg',
                path: './src/reporte/salida/grafBarras.png', // Ruta de la imagen
                cid: 'grafBarras' // CID para referenciar la imagen en el cuerpo del mensaje
            },
            {
                filename: 'imagen2.jpg',
                path: './src/reporte/salida/grafPieMdy.png', // Ruta de la imagen
                cid: 'grafPieMdy' // CID para referenciar la imagen en el cuerpo del mensaje
            },
            {
                filename: 'imagen3.jpg',
                path: './src/reporte/salida/grafPieTw.png', // Ruta de la imagen
                cid: 'grafPieTw' // CID para referenciar la imagen en el cuerpo del mensaje
            },
            {
                filename: 'imagen4.jpg',
                path: './src/reporte/salida/grafLineas.png', // Ruta de la imagen
                cid: 'grafLineas' // CID para referenciar la imagen en el cuerpo del mensaje
            }
        ]
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return logamarillo(1, `${ID_MOD} - %s`, error);
        }
        logamarillo(2, `${ID_MOD} - Mensaje enviado: %s, Destinatarios: %s`, info.envelope.from, JSON.stringify(info.envelope.to));
    });
}

function getCurrentDateTime() {
    const now = new Date();
    const options = {
        year: '2-digit', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat('es-ES', options);
    const parts = formatter.formatToParts(now);
    const date = `${parts[0].value}/${parts[2].value}/${parts[4].value}`; // dd/mm/yy
    const time = `${parts[6].value}:${parts[8].value}:${parts[10].value}`; // hh:mm:ss
    return { date, time };
}

// Verificar si se puede resolver post.servicoop.com
(function initTransporter() {
    dns.lookup(smtpHost, (err) => {
        if (err) {
            logamarillo(1, `${ID_MOD} - Error resolviendo ${smtpHost}, usando IP fallback: ${smtpHostFallback}`);
            transporter = createTransporter(smtpHostFallback);
        } else {
            logamarillo(1, `${ID_MOD} - ${smtpHost} resuelto correctamente.`);
            transporter = createTransporter(smtpHost);
        }
    });
})();

module.exports = EmailControl;

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);