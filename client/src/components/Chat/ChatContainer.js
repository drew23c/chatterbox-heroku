import React, { Component } from 'react';
import { MESSAGE_SENT, MESSAGE_RECIEVED, 
				TYPING, PRIVATE_MESSAGE, USER_CONNECTED, USER_DISCONNECTED,
				NEW_CHAT_USER, JOIN_ROOM, BROADCAST, SHOW } from '../../Events'
import ChatHeading from './ChatHeading'
import Messages from '../messages/Messages'
import MessageInput from '../messages/MessageInput'
import { values, difference, differenceBy } from 'lodash'
import '../../styling/chatstyles.css';

export default class ChatContainer extends Component {
	constructor(props) {
	  super(props);	
	
	  this.state = {
		  chats:[],
		  users:[],
		  activeChat:null
	  }
	}


	componentDidMount() {
		const { socket } = this.props
		this.initSocket(socket)
	}
	
	componentWillUnmount() {
		const { socket } = this.props
		socket.off(PRIVATE_MESSAGE)
		socket.off(USER_CONNECTED)
		socket.off(USER_DISCONNECTED)
		socket.off(NEW_CHAT_USER)
	}
	
	initSocket(socket){
    const {roomName, user} = this.props;
		socket.emit(JOIN_ROOM, user, roomName, this.resetChat);
	
		socket.on(USER_CONNECTED, (users)=>{
			this.setState({ users: values(users) })
		})

		const broadcast = data =>{
			this.setState({
				usersOnline: data.description
				})
			}
			socket.on(BROADCAST, data =>{
				broadcast(data)
			})

//5 secs will show user logged in and logged out
const show = data =>{
	let userShow = document.getElementById('userShow')
		this.setState({
			userShow: data.show
		})
			setTimeout((data)=>{
				this.setState({
					userShow:" "
					})
				}, 10000)
		 }
		socket.on(SHOW, data =>{
				show(data)
		})


		socket.on(USER_DISCONNECTED, (users)=>{
			const removedUsers = differenceBy( this.state.users, values(users), 'id')
			this.removeUsersFromChat(removedUsers)
			this.setState({ users: values(users) })			
		})
		socket.on(NEW_CHAT_USER, this.addUserToChat)
	}

	sendOpenPrivateMessage = (reciever) => {
		const { socket, user } = this.props
		const { activeChat } = this.state
		socket.emit(PRIVATE_MESSAGE, {reciever, sender:user.name, activeChat})

	}
	addUserToChat = ({ chatId, newUser }) => {
		const { chats } = this.state
		const newChats = chats.map( chat => {
			if(chat.id === chatId){
				return Object.assign({}, chat, { users: [ ...chat.users, newUser ] })
			}
			return chat
		})
		this.setState({ chats:newChats })
	}
	removeUsersFromChat = removedUsers => {
		const { chats } = this.state
		const newChats = chats.map( chat => {
			let newUsers = difference( chat.users, removedUsers.map( u => u.name ) )
				return Object.assign({}, chat, { users: newUsers })
		})
		this.setState({ chats: newChats })
	}


	resetChat = (chat)=>{
		return this.addChat(chat, true)
	}


	addChat = (chat, reset = false)=>{
		const { socket } = this.props
		const { chats } = this.state

		const newChats = reset ? [chat] : [...chats, chat]
		this.setState({
      chats:newChats,
      activeChat: (reset ? chat : this.state.activeChat)
    })

		//const messageEvent = `${MESSAGE_RECIEVED}-${chat.id}`
		const messageEvent = `${MESSAGE_RECIEVED}`;
		//const typingEvent = `${TYPING}-${chat.id}`

		//socket.on(typingEvent, this.updateTypingInChat(chat.id))
    /* This is where messages get added to the chat, when a message
     * comes back from the server)
     */
		socket.on(messageEvent, this.addMessageToChat(chat.id))
		const broadcast = data =>{
			this.setState({
				userSpam: data.spam
				})
			}
			socket.on(BROADCAST, data =>{
					broadcast(data)
				})

	}

	/*
	* 	Returns a function that will 
	*	adds message to chat with the chatId passed in. 
	*
	* 	@param chatId {number}
	*/
	addMessageToChat = (chatId)=>{
		return message => {
      console.log("Message:", message);
			const { chats } = this.state
			let newChats = chats.map((chat)=>{
				//if(chat.id === chatId)
					chat.messages.push(message)
				return chat
			})

			this.setState({chats:newChats})
		}
	}

	/*
	*	Updates the typing of chat with id passed in.
	*	@param chatId {number}
	*/
	updateTypingInChat = (chatId) =>{
		return ({isTyping, user})=>{
			if(user !== this.props.user.name){

				const { chats } = this.state

				let newChats = chats.map((chat)=>{
					if(chat.id === chatId){
						if(isTyping && !chat.typingUsers.includes(user)){
							chat.typingUsers.push(user)
						}else if(!isTyping && chat.typingUsers.includes(user)){
							chat.typingUsers = chat.typingUsers.filter(u => u !== user)
						}
					}
					return chat
				})
				this.setState({chats:newChats})
			}
		}
	}

	/*
	*	Adds a message to the specified chat
	*	@param chatId {number}  The id of the chat to be added to.
	*	@param message {string} The message to be added to the chat.
	*/
	sendMessage = (chatId, message)=>{
		const { socket } = this.props
		socket.emit(MESSAGE_SENT, {chatId, message} )
	}

	/*
	*	Sends typing status to server.
	*	chatId {number} the id of the chat being typed in.
	*	typing {boolean} If the user is typing still or not.
	*/
	sendTyping = (chatId, isTyping)=>{
		const { socket } = this.props
		socket.emit(TYPING, {chatId, isTyping})
	}

	setActiveChat = (activeChat)=>{
		this.setState({activeChat})
	}
	render() {
		const { user, logout,userSpam } = this.props
		const { chats, activeChat, users, usersOnline,userShow } = this.state
		return (
			<div>
			<div>
		
				<div className="chat-room-container">
					{
						activeChat !== null ? (

							<div className="chat-room">
								<ChatHeading name={activeChat.name} placeholder={logout} logout={logout} usersOnline={usersOnline}  />
								<Messages 
									messages={activeChat.messages}
									user={user}
									typingUsers={activeChat.typingUsers}
									spam={userSpam}
									show={userShow}
									/>
								<MessageInput 
									sendMessage={
										(message)=>{
											this.sendMessage(activeChat.id, message)
										}
									}
									sendTyping={
										(isTyping)=>{
											this.sendTyping(activeChat.id, isTyping)
										}
									}
									/>

							</div>
						):
						<div className="chat-room choose">
							<h3>Choose a chat!</h3>
						</div>
					}
				</div>
				</div>
			</div>

		);
	}
}