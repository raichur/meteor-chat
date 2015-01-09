Messages = new Meteor.Collection("Messages");
Meteor.subscribe("Messages");

Template.messages.helpers({
  messages: function(){
    return Messages.find({}, {sort: { timestamp: -1}, limit: 20});
  }
});

Template.input.events({
  'click #send': function(){
    var message = $('#newMessage').val(),
        username = $('#username').val();
    if(!message || !username){
      alert('You need to fill out both fields');
    }
    Meteor.saveMessage({
      message: message,
      username: username
    });
  }
});

Meteor.saveMessage = function(content){
  var username = content.username,
      message = content.message;
  if(!username || !message){
    return;
  }
  Messages.insert({
    username: username,
    message: message,
    timestamp: Date.now()
  }, function(err, id){
    if(err){
      alert('Sometimes definitely went wrong!');
    }
    if(id){
      $('#newMessage').val();
      $('#username').val();
    }
  });
}
