const fs = require("fs");
const dns = require("dns").promises;
const nodemailer = require("nodemailer");

const config = require("../config/loader");
const { logamarillo } = require("../control/controlLog");
const { formatDateTime } = require("../core/tiempo");

const ID_MOD = "CTRL-EMAIL";

const destinos = config.email.difusion;
const user = config.email.credenciales.user;
const pass = config.email.credenciales.pass;
const smtpHost = config.email.smtp.host;
const smtpHostFallback = config.email.smtp.fallback;

// Se inicializa una única vez para evitar reintentos DNS por cada envío.
const transporterPromise = initTransporter();

function createTransporter(host) {
  return nodemailer.createTransport({
    host,
    port: config.email.smtp.port,
    auth: {
      user,
      pass
    },
    tls: config.email.tls
  });
}

async function initTransporter() {
  try {
    await dns.lookup(smtpHost);
    logamarillo(1, `${ID_MOD} - ${smtpHost} resuelto correctamente.`);
    return createTransporter(smtpHost);
  } catch (err) {
    logamarillo(
      1,
      `${ID_MOD} - Error resolviendo ${smtpHost}, usando IP fallback: ${smtpHostFallback}`
    );
    return createTransporter(smtpHostFallback);
  }
}

class EmailControl {
  async enviar() {
    const transporter = await transporterPromise;
    const { date, time } = formatDateTime(new Date(), {
      dateOrder: "DMY",
      dateSeparator: "/",
      year: "2-digit"
    });

    let resumen = "";
    const htmlContent = fs.readFileSync(config.paths.reportTable, "utf8").trim();
    let pieLeyenda = "";

    try {
      const rawData = fs.readFileSync(config.paths.reportData, "utf8");
      const parsed = JSON.parse(rawData);
      const sitios = Array.isArray(parsed?.pieMdy?.sitiosConsiderados)
        ? parsed.pieMdy.sitiosConsiderados
        : [];
      if (sitios.length) {
        pieLeyenda =
          `<div style="text-align: center; font-family: 'consolas'; font-size: 12px; color: #444; margin: 2px auto 12px;">` +
          `Sitios: ${sitios.join(", ")}</div>`;
      }
    } catch (err) {
      pieLeyenda = "";
    }

    const mailOptions = {
      from: `<${config.email.smtp.from}>`,
      to: destinos,
      subject: `Reporte de agua potable ${date} ${time}`,
      text: resumen,
      html: `
        ${resumen}
        <div style="background-color: #000000; color: #ffffff; padding: 6px 20px; font-family: Consolas, monospace; font-size: 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="color: white;">
            <tr>
              <td align="left">
                <a href="${config.report.webUrl}" style="color: white; text-decoration: none;">
                  Reporte de agua → 🌐 <b>versión web</b>
                </a>
              </td>
              <td align="right">
                Desarrollado por Comunicaciones
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center;">
          <div style="display: inline-block; text-align: center;">
            ${htmlContent}
            <div style="height: 12px; line-height: 12px;">&nbsp;</div>
            <div style="text-align: center; font-family: 'consolas'; margin: 10px 0 8px; font-size: 16px;">
              Volúmenes y Porcentajes de agua en m3
            </div>

            <img src="cid:grafBarras" alt="Grafico de Barras" style="display: block; width: 103.5%; height: auto; margin: 0 auto 14px;"/>
            <img src="cid:grafPieMdy" alt="Grafico Pie Madryn" style="display: block; width: 46.96%; height: auto; margin: 0 auto 14px;"/>
            ${pieLeyenda}
            <img src="cid:grafLineas" alt="Grafico de Lineas" style="display: block; width: 90%; height: auto; margin: 0 auto 8px;"/>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: "grafBarras.png",
          path: config.paths.reportImages.barras,
          cid: "grafBarras"
        },
        {
          filename: "grafPieMdy.png",
          path: config.paths.reportImages.pieMdy,
          cid: "grafPieMdy"
        },
        {
          filename: "grafLineas.png",
          path: config.paths.reportImages.lineas,
          cid: "grafLineas"
        }
      ]
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      const destino = JSON.stringify(info.envelope.to);
      logamarillo(2, `${ID_MOD} - Mensaje enviado: ${info.envelope.from}, Destinatarios: ${destino}`);
    } catch (error) {
      logamarillo(1, `${ID_MOD} - ${error.message}`);
      throw error;
    }
  }
}

module.exports = EmailControl;

logamarillo(1, `${ID_MOD} - Directorio del archivo:`, __dirname);
