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
