import * as MessagingHub from 'messaginghub-client';
import WebSocketTransport from 'lime-transport-websocket';
import Lime from 'lime-js';
import { IDENTIFIER, ACCESS_KEY } from './blipAuth';
import moment from 'moment';

import calendar from './calendar';

const client = new MessagingHub.ClientBuilder()
  .withIdentifier(IDENTIFIER)
  .withAccessKey(ACCESS_KEY)
  .withTransportFactory(() => new WebSocketTransport(null, true))
  .build();

client.eventProperties = {
  summary: '',
  location: '',
  description: '',
};

function setState(sessionState, from) {
  const command = {
    id: Lime.Guid(),
    method: 'set',
    uri: `/buckets/${encodeURIComponent(from.split('/')[0])}`,
    type: 'application/json',
    resource: {
      sessionState,
    },
  };

  // Grava a sessão do usuário no servidor
  client.sendCommand(command);
}

function logMsg(m) {
  console.log(m);
  // Passa a execução para o proximo receiver.
  return true;
}

function bye(m) {
  const command = {
    id: Lime.Guid(),
    method: 'delete',
    uri: `/buckets/${encodeURIComponent(m.from.split('/')[0])}`,
  };

  client.sendCommand(command);

  const message = {
    id: Lime.Guid(),
    type: 'text/plain',
    content: 'Volte sempre! :)',
    to: m.from,
  };

  client.sendMessage(message);
}



function welcome(m) {
  const params = m.from.split('@');
  const command = {
    id: Lime.Guid(),
    to: `postmaster@${params[1]}`,
    method: 'get',
    uri: `lime://${params[1]}/accounts/${encodeURIComponent(params[0])}`,
  };

  client.sendCommand(command)
    .then((userSession) => {
      const message = {
        id: Lime.Guid(),
        type: 'text/plain',
        content: `Bem vindo, ${userSession.resource.fullName.split(' ')[0]}`,
        to: m.from,
      };

      client.sendMessage(message, m.from);

      setState('choose_op', m.from);
    });
}


client.messageSend = (msg, from) => {
  const message = {
        id: Lime.Guid(),
        type: 'text/plain',
        content: msg,
        to: from,
      };

    client.sendMessage(message);
};

client.eventCreation = (arr) => {

  /*
    arr[0]: Nome do Evento
    arr[1]: Localização
    arr[2]: Descrição
    arr[3]: Data de Início
    arr[4]: Hora de início
    arr[5]: Data do Fim
    arr[6]: Hora do Fim
  */

  //yyyy-mm-ddThh:mm:ss-hh:mm(GMT)

  calendar.exec('createEvent', {
          summary: arr[0].trim(),
          location: arr[1].trim(),
          description: arr[2].trim(),
          start: {
            dateTime: arr[3].trim().replace(/\//g, '-') + 'T' + arr[4].trim() + ':00-03:00',
            timeZone: 'America/Los_Angeles',
          },
          end: {
            dateTime: arr[5].trim().replace(/\//g, '-') + 'T' + arr[6].trim() + ':00-03:00',
            timeZone: 'America/Los_Angeles',
          },
          /*
          recurrence: [
            'RRULE:FREQ=DAILY;COUNT=2',
          ],
          */
          attendees: [
            { email: 'joao.pedro@eteg.com.br' },
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 10 },
            ],
          },
        });
};

function states(m) {
console
  const command = {
    id: Lime.Guid(),
    method: 'get',
    uri: `/buckets/${encodeURIComponent(m.from.split('/')[0])}`,
  };



  client.sendCommand(command)
    .then((userSession) => {
      switch (userSession.resource.sessionState) {
        case 'choose_op': {
          const message = {
            id: Lime.Guid(),
            to: m.from,
            type: 'application/vnd.lime.select+json',
            content: {
              text: 'Escolha uma opção',
              options: [
                {
                  text: 'Ver eventos',
                },
                {
                  text: 'Ver horários vagos',
                },
                {
                  text: 'Agendar evento',
                },
                {
                  text: 'Cancelar evento',
                },
              ],
            },
          };
          client.sendMessage(message);
          break;
        }

        default:
          break;
      }
    }).catch(error => console.log(error));
}

client
  .connect()
  .then(() => {
    console.log('connected');

    // Toda mensagem que chegar vai ser logada no console
    client.addMessageReceiver(true, logMsg);

    // Limpa a sessão
    client.addMessageReceiver(
      m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'tchau',
      bye,
    );

    // Mensagem de bem vindo
    client.addMessageReceiver(
      m => m.type === 'text/plain' && m.content.toLowerCase().trim() === '#welcome',
      welcome,
    );

    // Trata os estados do bot
    client.addMessageReceiver(true,states);

    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'agendar evento',
      (m) => {

        setState('nenhum', m.from);

      //Evento teste ; Belo Horizonte ; Teste ; 2017/05/30 ; 09:00 ;  2017/05/30 ; 10:00
      client.messageSend('Escreva as informações do seu evento separadas por ";": Nome do evento; Localização; Descrição; Data de Início; Hora de início; Data de fim; Hora do fim', m.from);
      client.addMessageReceiver(m => m.content.toLowerCase().trim() !== 'agendar evento', (m) => {
        //client.messageSend(m.content, m.from) // Hora do fim(yyyy-mm-ddThh:mm:ss-hh:mm(GMT);
        var msgContent = m.content.split(';');
        console.log(msgContent);
        client.eventCreation(msgContent);
      });
      
    });


//${events.join('\n')}
    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'cancelar evento',
      (m) => {

        setState('nenhum', m.from);

        calendar.exec('listEvents', (events) => {
          const message = {
            id: Lime.Guid(),
            type: 'text/plain',
            content: `Qual evento você quer cancelar?\n${events.join('\n')}`,
            to: m.from,
          };
          client.sendMessage(message);
        });


        client.addMessageReceiver(m => m.content.toLowerCase().trim() !== 'cancelar evento', (m) => {
          //console.log('testeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
          
          client.messageSend(m.content, m.from);         
         
          calendar.exec('deleteEvent',{//eventId: events[0].id,
          });
        });

      });

    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'ver eventos',
      (m) => {

        setState('nenhum', m.from);

        calendar.exec('listEvents', (events) => {
          const message = {
            id: Lime.Guid(),
            type: 'text/plain',
            content: `Eventos na agenda:\n${events.join('\n')}`,
            to: m.from,
          };

          client.sendMessage(message);
        });
      });

      client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'ver horários vagos',
      (m) => {

        setState('nenhum', m.from);

        calendar.exec('listAvailableTime', (horarios) => {
          const message = {
            id: Lime.Guid(),
            type: 'text/plain',
            content: `Horários vagos:\n${horarios.join(', ')}`,
            to: m.from,
          };

          client.sendMessage(message);
        });
      });


    /*Funciona
    client.addMessageReceiver(x => true, (x) => {
      const message = {
        id: Lime.Guid(),
        type: 'text/plain',
        content: x.content,
        to: x.from,
      };

      client.sendMessage(message);
    });
*/
      
  }).catch(() => {
    // TODO
  });
