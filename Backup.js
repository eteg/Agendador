import * as MessagingHub from 'messaginghub-client';
import WebSocketTransport from 'lime-transport-websocket';
import Lime from 'lime-js';
import { IDENTIFIER, ACCESS_KEY } from './blipAuth';

import calendar from './calendar';

const client = new MessagingHub.ClientBuilder()
  .withIdentifier(IDENTIFIER)
  .withAccessKey(ACCESS_KEY)
  .withTransportFactory(() => new WebSocketTransport(null, true))
  .build();

client.perguntas = [ 
    {texto: 'agendar evento', status: false},
    'nome do evento', 
    'localização'
  ];

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

function configuraEvento(m){
    
    const numeroAtributos = Object.keys(client.eventProperties).length;
    const numeroAtributosPreenchidos = Object.keys(client.eventProperties).filter(function(key){
          return client.eventProperties[key] ? true : false;
    }).length;

  if(numeroAtributos == numeroAtributosPreenchidos){
    client.eventCreation();
    return;
  }
    

  if(client.perguntas.map(function(pergunta){ return pergunta.texto}).includes(m.content)){
        
      var perguntaFeita = perguntas.find(function(pergunta){
          return pergunta.texto == m.content
      });

      perguntaFeita.status = true;

    }else{

        for(prop in client.eventProperties){            
            if(!client.eventProperties[prop]){
                client.eventProperties[prop] = m.content;

                var proximaPergunta = perguntas.find(function(pergunta){
                      return pergunta.status == false;
                });
                client.sendMessage(proximaPergunta.texto);
                break;
            };
      }
      
    }


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

function states(m) {

  const command = {
    id: Lime.Guid(),
    method: 'get',
    uri: `/buckets/${encodeURIComponent(m.from.split('/')[0])}`,
  };

client.messageContent = () => {
  client.addMessageReceiver(msg => true, (msg) => {
      const message = {
        id: Lime.Guid(),
        type: 'text/plain',
        content: msg.content,
        to: msg.from,
      };   
  });
};

client.messageSend = (msg, from) => {
  const message = {
        id: Lime.Guid(),
        type: 'text/plain',
        content: msg,
        to: from,
      };

    client.sendMessage(message);
};

client.eventCreation = () => {
  calendar.exec('createEvent', {
          summary: client.eventProperties.summary,
          location: 'Belo Horizonte',
          description: 'Workshop Blip',
          start: {
            dateTime: '2017-05-26T09:00:00-03:00',
            timeZone: 'America/Los_Angeles',
          },
          end: {
            dateTime: '2017-05-26T17:00:00-03:00',
            timeZone: 'America/Los_Angeles',
          },
          recurrence: [
            'RRULE:FREQ=DAILY;COUNT=2',
          ],
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
    client.addMessageReceiver(
      true,
      states);

      client.addMessageReceiver(
      true,
      configuraEvento);

    client.addMessageReceiver(m => client.isMessageReceive(m, 'nome do evento'), (m) => {
      client.eventProperties.summary = m.content;
     });
     
     client.addMessageReceiver(m => client.isMessageReceive(m, 'localização'), (m) => {
      client.eventProperties.location = m.content;      
      client.eventCreation();
     });

     client.isMessageReceive = (msgReceive, msg) =>{
        return (msgReceive.type === 'text/plain' && msgReceive.content.toLowerCase().trim() === msg)
     };

    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'agendar evento',
      (m) => {
      
      client.messageSend('Nome do Evento', m.from);      
      
    });

    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'cancelar evento',
      (m) => {
        const message = {
          id: Lime.Guid(),
          type: 'text/plain',
          content: 'Volte mais tarde. Essa funcionalidade está sendo desenvolvida. :(',
          to: m.from,
        };

        client.sendMessage(message);
      });

    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'ver eventos',
      (m) => {
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
