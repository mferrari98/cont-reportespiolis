const config = require("../../config.json")

const fs = require('fs');
const nodemailer = require('nodemailer');
const dns = require('dns');

const ID_MOD = "CtrlEmail"

const verLog = config.desarrollo.verLog
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
    let resumen = "Generacion automatica de reportes mejorada"
    let htmlContent = fs.readFileSync('./reporte/salida/tabla.html', 'utf8');
    
    let mailOptions = {
        from: "<fachada.correo@servicoop.com>",
        to: destinos,
        subject: `Reporte de agua potable ${date} ${time}`,
        text: resumen,
        html: `
            ${resumen}
            ${htmlContent}
            <div style="text-align: center;">
                <img src="cid:grafBarras" alt="Grafico de Barras"/>
                <img src="cid:grafLineas" alt="Grafico de Lineas"/>
                <img src="cid:grafPie" alt="Grafico Pie"/>
            </div>
            `,
        attachments: [            
            {
                filename: 'imagen.jpg',
                path: './reporte/salida/grafBarras.png', // Ruta de la imagen
                cid: 'grafBarras' // CID para referenciar la imagen en el cuerpo del mensaje
            },
            {
                filename: 'imagen2.jpg',
                path: './reporte/salida/grafLineas.png', // Ruta de la imagen
                cid: 'grafLineas' // CID para referenciar la imagen en el cuerpo del mensaje
            },
            {
                filename: 'imagen3.jpg',
                path: './reporte/salida/grafPie.png', // Ruta de la imagen
                cid: 'grafPie' // CID para referenciar la imagen en el cuerpo del mensaje
            }
        ]
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Mensaje enviado: %s, Destinatarios: %s', info.envelope.from, JSON.stringify(info.envelope.to));
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
            console.log(`${ID_MOD} - Error resolviendo ${smtpHost}, usando IP fallback: ${smtpHostFallback}`);
            transporter = createTransporter(smtpHostFallback);
        } else {
            console.log(`${ID_MOD} - ${smtpHost} resuelto correctamente.`);
            transporter = createTransporter(smtpHost);
        }        
    });
})();

module.exports = EmailControl;

if (verLog) {
    console.log(`${ID_MOD} - Directorio trabajo:`, process.cwd());
    console.log(`${ID_MOD} - Directorio del archivo:`, __dirname);
}