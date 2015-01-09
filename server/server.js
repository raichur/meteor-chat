Messages = new Meteor.Collection("Messages");

Meteor.publish("Messages", function(){
  return Messages.find();
});

Messages.allow({
  'insert': function(userId, doc){
    return true;
  },
  'remove': function(userId, doc){
    return false;
  }
});
