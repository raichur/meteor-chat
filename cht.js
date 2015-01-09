var MeteorUser = function(){
  var userId = Meteor.userId();
  if(!userId){
    return null;
  }
  var user = Meteor.users.findOne(userId);
  return user;
}

var okCancelEvents = function(selector, callbacks){
  var ok = callbacks.ok || function(){};
  var cancel = callbacks.cancel || function(){};
  var events = {};
  events['keyup ' + selector + ', keydown ' + selector + ', focusout ' + selector] =
  function(evt){
    if(evt.type === 'keydown' && evt.which === 27){
      cancel.call(this, evt);
    } else if(evt.type === 'keyup' && evt.which === 13 || evt.type === 'focusout'){
      var value = String(evt.target.value || "");
      if(value){
        ok.call(this, value, evt);
      } else {
        cancel.call(this, evt);
      }
    }
  }
  return events;
}

var activateInput = function(input){
  input.focus();
  input.select();
}

UI.registerHelper('breaklines', function(text){
  var html = '';
  if(text){
    html = text.replace(/n(\r\n|\n|\r)/gm, '<br/>');
  }
  return Spacebars.SafeString(html);
});

UI.registerHelper('authorCSS', function(author){
  var cssClass = "bubbledLeft";
  if(author == Meteor.userId()){
    cssClass = "bubbledRight";
  }
  return cssClass;
});


if(Meteor.isClient) {
    Messages = new Meteor.Collection("messages");
    Channels = new Meteor.Collection("channels");

    Meteor.startup(function(){
      Meteor.loginVisitor();
      Session.setDefault('name', 'Guest');
      Session.setDefault('channel', 'cht');
    });

    Template.chat.helpers({

    messages: function(){
      var messagesCursor = Messages.find({}, {sort: {timestamp: -1}, limit: 42});
      var messages = messagesCursor.fetch().reverse();
      for(var i = messages.length - 1; i >= 0; i--){
        var user = Meteor.users.findOne(messages[i].author);
        if(user){
          messages[i].name = user.profile.name;
        }
        messages[i].name = "Unknown";
      }

      var conversations = [];
      var newConversation = messages[0];
      for(var i = 0; i <= messages.length - 2; i++){
        var timedelta = messages[i + 1].timestamp - messages[i].timestamp;
        var sameauthor = (messages[i + 1].author === messages[i].author);
        if(timedelta <= 30000 && sameauthor){
          newConversation.message = newConversation.message + " \n" + messages[i + 1].message;
        } else {
          conversations.push(newConversation);
          newConversation = messages[i + 1];
        }
      }
      conversations.push(newConversation);
      return conversations;
    }

  });

  Template.chat.events(okCancelEvents('#messageInput', {
      ok: function(value, evt){
      Messages.insert({
        author: Meteor.userId(),
        message: value,
        timestamp: (new Date()).getTime(),
        channel: Session.get('channel')
      });
      evt.target.value = '';
    }
  }));

  Template.participants.helpers({

    name: function(){
      var user = Meteor.users.findOne(Meteor.userId());
      if(user){
        Session.set('name', user.profile.name);
      }
      return Session.get('name');
    },

    participants: function(){
      var labelClass = function(id){
        if(id === Meteor.userId()){
          return "#428bca";
        }
        var user = Meteor.users.findOne(id);
        if(user){
          if(user.status.online){
            return "#5cb85c";
          }
          return "#f0ad4e";
        }
        return "#d9534f";
      }

      var participants = Meteor.users.find({}).fetch();
      for(var i = participants.length - 1; i >= 0; i--){
        participants[i].labelClass = labelClass(participants[i]._id);
      }
      return participants;
    }

  });

  Template.participants.events(okCancelEvents('#nameInput', {
    ok: function(value, evt){
      if(value){
        var user = Meteor.users.findOne(Meteor.userId());
        if(user){
          Meteor.users.update({_id:Meteor.userId()}, {$set:{"profile.name": value}})
        }
        Session.set("name", value);
      }
    }
  }));


  Template.homepage.events(okCancelEvents('#channelInput', {
    ok: function(value, evt){
      if(value){
        Session.set('channel', value);
      }
    }
  }));

  Template.homepage.helpers({

    channel: function(){
      return Session.get('channel');
    },

    channels: function(){
      return Channels.find({}, {limit: 50});
    }

  });

  Template.homepage.events({
    'click #channelButton': function(event, template){
      Router.go('/c/' + Session.get('channel'));
    }
  });


  Router.configure({
    layoutTemplate: 'layout'
  });

  Router.map(function(){
    this.route('channel', {
      path: '/c/:channel',
      template: 'channel',
      layoutTemplate: 'layout',
      waitOn: function(){
        Session.set('channel', this.params.channel);
        Meteor.subscribe('chatroomMessages', this.params.channel);
        Meteor.subscribe('channels', this.params.channel);
      },
      data: function(){
        var channel = Channels.findOne({name: this.params.channel});
        var participants = [Meteor.userId()];
        if(channel){
          var participants = channel.participants;
        }
        Meteor.subscribe('users', participants);
      }
    });

    this.route('home', {
      path: '/',
      template: 'homepage',
      layoutTemplate: 'layout',
      data: function(){
        Meteor.subscribe('channelslist');
      }
    });
  });
}


if(Meteor.isServer){
  Meteor.startup(function(){
    Messages = new Meteor.Collection("messages");
    Channels = new Meteor.Collection("channels");
  });

  Meteor.publish('channelslist', function(){
    return Channels.find({});
  });

  Meteor.publish('channels', function(channel){
    var id;
    if(Channels.findOne({name: channel}) == null){
      id = Channels.insert({
        name: channel,
        created_timestamp: (new Date()).getTime(),
        created_author: this.userId,
        participants: [],
        message: 0
      });
    } else {
      id = Channels.findOne({name: channel})._id;
    }
    if(id){
      Channels.update({_id: id}, {$addToSet: {participants: this.userId}});
    }
    return Channels.find({});
  });

  Meteor.publish('users', function(listUsers){
    return Meteor.users.find({_id: {$in: listUsers}});
  });

  Meteor.publish('chatroomMessages', function(channel){
    return Messages.find({channel: channel}, {sort: {timestamp: -1}, limit: 50});
  });
}
