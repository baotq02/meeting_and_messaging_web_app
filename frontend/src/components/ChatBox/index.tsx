import {
  FC,
  ChangeEvent,
  useState,
  useEffect,
  useRef,
  useMemo
} from 'react';
import './style.css';
import { getSocket } from '../../SocketController';
import { ProfileData } from '../../pages/Main';
import { useNavigate } from 'react-router-dom';
import ThemeSwitch from '../ThemeSwitch';
import Room from '../Room';
import { ChatRoom } from '../RoomsList';
import VisibilitySensor from 'react-visibility-sensor';
import PendingFigure from '../PendingFigure';
interface Message {
  sender: string;
  content: string;
  avatar?: string;
  timestamp: string;
}

interface ChatRoomData {
  messages: Message[];
  conversationLength: number;
  isMeeting?: boolean;
  meeting_uuid?: string | null;
}

interface ChatBoxProps {
  // onMessageEmit: (message: Message) => void;
  token: string;
  room: ChatRoom;
  profile: ProfileData;
}


let socket: any;
let justSent: boolean;
let bottomIsVisible: boolean;
const DEFAULT_MESSAGES_LIMIT: number = 30;


const getMessages = (
  roomId: string,
  token: string,
  limit?: string,
  skip?: string): Promise<any> => {
  return fetch(`/api/v1/rooms/${roomId}?limit=${limit}&skip=${skip}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
  })
    .then((response) => {
      if (response.status === 304) {
        throw new Error("Already got this")
      }
      if (response.ok) {
        return response.json();
      }
      if (response.status == 401) {
        alert("Token expired");
        sessionStorage.removeItem('token');
      }
      throw new Error('Failed to fetch messages');
    });
};

const ChatBox: FC<ChatBoxProps> = ({ room, token, profile }) => {
  let conversationLength: number;
  const [inputValue, setInputValue] = useState<string>('');
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [meeting, setMeeting] = useState<string | null>()
  const roomIdRef = useRef(room._id);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const btnScrollRef = useRef<HTMLButtonElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  // const roomProfileRef = useRef<ReactNode | null>(null);
  const navigate = useNavigate();


  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    console.log('typing ...');
  };

  const handleSendMessage = () => {
    if (inputValue.trim() !== '') {
      socket?.emit("msg", [room._id, inputValue, new Date()]);
      justSent = true;
      setInputValue('');
    }
  };


  const handleReceiveMessage = (msg: string[]) => {
    //msg: [sender, content, date, room id]
    if (msg[1] === roomIdRef.current) {
      const sender = msg[0];
      if (
        //check if sender is participant of the room
        sender !== profile?._id
        && !room.participants.some(
          (participant) => participant._id === sender)
      ) {
        return
      }
      if (btnScrollRef.current) {
        console.log("thissssssssss")
        btnScrollRef.current.style.display = "block"
      }
      const content = msg[2];
      const timestamp = msg[3];
      conversationLength++;
      // Update the messages state to include the received message
      setMessages((prevMessages) => {
        if (prevMessages !== null) {
          return [...prevMessages, { sender, content, timestamp }];
        } else {
          return [{ sender, content, timestamp }];
        }
      });
    } else {
      console.log("New message, room: " + msg[1]) // do something
    }
  }
  const handleMakeCall = () => {
    socket?.emit("meet", [room._id, new Date()]);
  }
  const handleJoinCall = (uuid: string) => {
    const url = `/meet/${uuid}?token=${token}&room=${room._id}`;
    window.open(url)

  }
  const handleReceiveCall = (msg: string[]) => {
    // msg: [sender id,room ID, meeting UUID, date]
    if (msg[1] == room._id) {
      setMeeting(msg[2]);
    }
    if (msg[0] == profile?._id) {
      // it's the call this user made
      if (msg[3]) {
        //already joined
        return
      }
      return handleJoinCall(msg[2]);
    }

    // Show a notification
    if (Notification.permission === "granted") {
      const notification = new Notification("Incoming Call", {
        body: "You have an incoming call. Do you want to join?",
        icon: "path/to/notification-icon.png",
        requireInteraction: true,
      });

      // Handle user's response to the notification
      notification.addEventListener("click", () => {
        // Open a new tab and pass the UUID to it
        handleJoinCall(msg[2])
      });
    } else if (Notification.permission !== "denied") {
      // Request permission to show notifications
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          // Show the notification after permission is granted
          handleReceiveCall(msg);
        }
      });
    }
  };
  const handleEndCall = () => {
    setMeeting(null)
  }

  const handleScrollBottom = (target: HTMLElement) => {
    target.scrollIntoView({ behavior: "smooth" });
    if (btnScrollRef.current) btnScrollRef.current.style.display = "none"
  }

  useEffect(
    () => {
      try {
        if (!token || !room) {
          return;
        }
        getMessages(room._id, token)
          .then((data: ChatRoomData) => {
            setMessages(data.messages);
            if (data.conversationLength) {
              conversationLength = data.conversationLength;
            }
            if (data.meeting_uuid) {
              setMeeting(data.meeting_uuid)
            } else {
              setMeeting(null);
            }
          })
          .catch(
            () => {
              navigate("/auth");
            });
      }
      catch (err) {
        console.error(err);
      }
    }, [token, room._id]
  )
  useEffect(() => {
    if (token) {
      socket = getSocket(token);
      socket?.on("msg", handleReceiveMessage);
      socket?.on("meet", handleReceiveCall);
      socket?.on("end_meet", handleEndCall)
    }
  }, [token])

  useEffect(() => {
    roomIdRef.current = room._id;
    if (topRef.current) { topRef.current.style.display = "none"; }
    const tOut = setTimeout(() => {
      if (topRef.current &&
        messagesContainerRef.current &&
        messagesContainerRef.current.scrollHeight > messagesContainerRef.current.clientHeight) {
        topRef.current.style.display = "flex";
      }
      // Only allow the top visibility sensor to be displayed after initial render
    }, 1000);

    return () => {
      // Clear the timeout when the component unmounts
      clearTimeout(tOut);
    };
  }, [room._id]);

<<<<<<< HEAD
  return (
    <div id="chat-box">
      <div className="header">
          <div className="userimg">
            <img src="./assets/img/img_new/sage.jpg" alt="" className='cover' id='ava_r_header'/>
          </div>
          <h4>Sage</h4>
          <ul className="nav_icons">
            <li><ThemeSwitch /></li>
            <li><button className='btn_profile' onClick={handleMakeCall}><i className='bx bxs-phone-call'></i></button></li>
          </ul>
        </div>
      <div className="message-container">
=======

  useEffect(() => {
    if (!bottomRef.current || !messagesContainerRef.current || !messages) return
    if (messages.length <= DEFAULT_MESSAGES_LIMIT) {
      // if this is the first load 
      return handleScrollBottom(bottomRef.current)
    }
    if (messages[messages.length - 1].sender != profile._id) {
      if (bottomIsVisible)
        return handleScrollBottom(bottomRef.current);
      messagesContainerRef.current.scrollTop = 300;
      return
    }
    if (justSent) {
      // if it is this user who have just send a message
      justSent = false;
      return handleScrollBottom(bottomRef.current)
    }

  }, [messages]);


  const messagesContainer = useMemo(() => {
    return (
      <>
>>>>>>> 7269e37554072280b39f3809997e5835998da46b
        {
          Array.isArray(messages) &&
          messages.map((message: Message, index: number) => {
            let avatarSRC: string;
            if (message.sender && message.sender == profile?._id) {
              avatarSRC = profile.avatar
            } else {
              const sender = room.participants.find(
                (participant) => participant._id === message.sender
              );
              avatarSRC = sender ? sender.avatar : "";
            }
            return (
              <div key={index}
                className={`message ${message.sender == profile?._id ? 'own' : ''}`}>
<<<<<<< HEAD
                {avatarSRC && (
                  <img className="inchat-avatar" src={avatarSRC} alt="Sender Avatar" />
                )}
                <span id='mess_content'>{message.content}</span>
                <span id='mess_time'>{message.timestamp}</span>
=======
                <div className='message_wrapper'>
                  {message.sender != profile?._id && avatarSRC && (
                    <img className="inchat-avatar" src={avatarSRC} alt="Sender Avatar" />
                  )}
                  <p>{message.content}</p>
                </div>
                <p className='message_timestamp'>{message.timestamp}</p>
>>>>>>> 7269e37554072280b39f3809997e5835998da46b
              </div>
            );
          })
        }
      </>
    )
  }, [messages])

  const handleGetMoreMessages = (isVisible: boolean) => {
    if (!isVisible) return
    if (!messages || messages.length == 0) {
      return
    }
    if (messages.length >= conversationLength) {
      // All messages received
      if (topRef.current) topRef.current.style.display = "none"
      return
    }
    let skip;
    let messagesLimit = DEFAULT_MESSAGES_LIMIT;
    skip = conversationLength - messages.length - messagesLimit
    if (skip < 0) {
      messagesLimit += skip;
      skip = 0;
    }
    getMessages(room._id, token, `${messagesLimit}`, `${skip}`)
      .then((data: ChatRoomData) => {
        setMessages(
          (prev) => {
            if (prev)
              return data.messages.concat(prev)
            return data.messages
          });
        if (data.conversationLength) {
          conversationLength = data.conversationLength;
        }
        if (data.meeting_uuid) {
          setMeeting(data.meeting_uuid)
        } else {
          setMeeting(null);
        }
      })
      .catch(
        () => {
          navigate("/auth");
        });

  }

  return (
    <div id="chat-box">
      <div id="chat-box_topbar" className='flex'>
        <div id="chat-box_topbar_left">
          <Room userId={profile?._id} participants={room.participants} />
          <button className="btn" onClick={handleMakeCall}>
            <i className='bx bxs-video' ></i>
          </button>
          {meeting && (
            <>
              <p>This room is in a meeting</p>
              <button onClick={() => handleJoinCall(meeting)}>Join</button>
            </>
          )}
        </div>
        <ThemeSwitch />
      </div>
<<<<<<< HEAD
      <div className="input-container flex">
      <i className='bx bx-happy-alt btn_profile' ></i>
      <i className='bx bxs-file-blank btn_profile' ></i>
=======
      <div ref={messagesContainerRef} id="messages-container">
        <VisibilitySensor onChange={handleGetMoreMessages} >
          <div ref={topRef} id="topRef">
            <PendingFigure size={50} />
          </div>
        </VisibilitySensor>
        {messagesContainer}
        <VisibilitySensor onChange={(_: boolean) => { bottomIsVisible = _ }} >
          <div ref={bottomRef}>.</div>
        </VisibilitySensor>
      </div>
      <button id='btn_scroll' ref={btnScrollRef}
        onClick={() => {
          if (bottomRef.current) handleScrollBottom(bottomRef.current)
        }}
      >
        {messages && messages[messages.length-1].content} <i className='bx bx-down-arrow-alt'></i>
      </button>
      <img id="chat-box_bg" src="/assets/img/img_new/pattern.png" />
      <div id='chat-box_input-container'>
>>>>>>> 7269e37554072280b39f3809997e5835998da46b
        <input
          type="text"
          value={inputValue}
          id='input_message'
          onChange={handleInputChange}
          onKeyDown={(e) => { e.key == 'Enter' && handleSendMessage() }}
        />
<<<<<<< HEAD
        <button onClick={handleSendMessage} className="send-button btn_profile">
        <i className='bx bxs-send' ></i>
=======
        <button onClick={handleSendMessage} className="btn">
          <i className='bx bxs-send' ></i>
>>>>>>> 7269e37554072280b39f3809997e5835998da46b
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
