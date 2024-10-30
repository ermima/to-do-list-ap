import { FaPencilAlt, FaPlus, FaTrash } from 'react-icons/fa';
import './App.css';
import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from './firebase';

function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [editIndex, setEditIndex] = useState(-1);
  const [forgotEmail, setForgotEmail] = useState(''); // Email for password reset
  const [showForgotPassword, setShowForgotPassword] = useState(false); // Forgot Password modal visibility

  useEffect(() => {
    // Ensure persistence
    setPersistence(auth, browserLocalPersistence)
      .then(() => console.log("Persistence set to local"))
      .catch(error => console.log("Error setting persistence:", error.message));

    // Check for an authenticated user
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Fetch todos specific to the logged-in user
        const todosQuery = query(collection(db, 'todos'), where("userId", "==", currentUser.uid));
        const unsubscribeTodos = onSnapshot(todosQuery, (snapshot) => {
          const fetchedTodos = snapshot.docs.map((doc) => ({ id: doc.id, todo: doc.data().todo }));
          setTodos(fetchedTodos);
        });

        // Unsubscribe from Firestore listener when the component is unmounted or user logs out
        return () => unsubscribeTodos();
      } else {
        // Clear todos when user logs out
        setTodos([]);
      }
    });

    // Clean up authentication listener
    return () => unsubscribeAuth();
  }, []);

  const register = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error("Error registering user:", error.message);
    }
  };

  const login = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error("Error logging in:", error.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setTodos([]);  // Clear todos on logout
  };

  const addTodo = async () => {
    try {
      if (input.trim() !== '') {
        await addDoc(collection(db, 'todos'), { todo: input, userId: user.uid });
        setInput('');
      }
    } catch (error) {
      console.log("Error adding todo:", error.message);
    }
  };

  const setEdit = (index) => {
    setInput(todos[index].todo);
    setEditIndex(index);
  };

  const updateTodo = async () => {
    try {
      if (input.trim() !== '') {
        const todoDocRef = doc(db, 'todos', todos[editIndex].id);
        await updateDoc(todoDocRef, { todo: input });
        setEditIndex(-1);
        setInput('');
      }
    } catch (error) {
      console.log("Error updating todo:", error.message);
    }
  };

  const removeTodo = async (id) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      console.error("Error removing todo:", error.message);
    }
  };

  // Password reset functionality
  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      alert('Password reset link has been sent to your email.');
      setForgotEmail('');
      setShowForgotPassword(false);
    } catch (error) {
      console.error("Error sending password reset email:", error.message);
      alert("Error: " + error.message);
    }
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center gap-4 p-4 bg-custom-background bg-center bg-cover'>
      {!user ? (
        <div className='bg-gray-100 p-4 rounded shadow-md w-full max-w-lg lg:w-1/4'>
          <h1 className='text-3xl font-bold text-center p-2'>Login / Register</h1>
          <input
            type='email'
            placeholder='Email'
            className='py-2 px-4 border rounded focus:outline-none mr-2 w-full'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type='password'
            placeholder='Password'
            className='py-2 px-4 border rounded focus:outline-none mr-2 w-full my-2'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={login} className='bg-blue-500 text-white py-2 px-4 rounded w-full'>
            Login
          </button>
          <button onClick={register} className='bg-green-500 text-white py-2 px-4 rounded w-full mt-2'>
            Register
          </button>
          <button
            onClick={() => setShowForgotPassword(true)}
            className='text-blue-500 text-sm underline mt-2'
          >
            Forgot Password?
          </button>
        </div>
      ) : (
        <>
          <button onClick={logout} className='bg-red-500 text-white py-2 px-4 rounded mt-2'>
            Logout
          </button>
          <div className='bg-gray-100 p-4 rounded shadow-md w-full max-w-lg lg:w-1/4'>
            <h1 className='text-3xl font-bold text-center p-2'>Todo App</h1>
            <div>
              <input
                type='text'
                placeholder='Add a todo'
                className='py-2 px-4 border rounded focus:outline-none mr-2'
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button onClick={editIndex === -1 ? addTodo : updateTodo} className='bg-gradient-to-r from-blue-400 to-blue-600 text-white py-2 px-4'>
                {editIndex === -1 ? <FaPlus /> : <FaPencilAlt />}
              </button>
            </div>
          </div>
          {todos.length > 0 && (
            <div className='bg-gray-100 p-6 rounded shadow-md w-full max-w-lg lg:w-1/4'>
              <ul>
                {todos.map((todo, index) => (
                  <li key={index} className='flex items-center justify-between bg-white p-3 rounded shadow-md mb-3'>
                    <span className='text-lg'>{todo.todo}</span>
                    <div>
                      <button onClick={() => setEdit(index)} className='mr-2 p-2 bg-gradient-to-r from-gray-400 to-gray-600 text-white rounded hover:from-gray-500 hover:to-gray-700'>
                        <FaPencilAlt />
                      </button>
                      <button onClick={() => removeTodo(todo.id)} className='mr-2 p-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded hover:from-red-500 hover:to-red-700'>
                        <FaTrash />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {showForgotPassword && (
        <div className='fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75'>
          <div className='bg-white p-6 rounded shadow-md w-full max-w-sm'>
            <h2 className='text-xl font-bold mb-4'>Reset Password</h2>
            <input
              type='email'
              placeholder='Enter your email'
              className='py-2 px-4 border rounded focus:outline-none w-full mb-4'
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <button onClick={handlePasswordReset} className='bg-blue-500 text-white py-2 px-4 rounded w-full'>
              Send Reset Link
            </button>
            <button onClick={() => setShowForgotPassword(false)} className='text-gray-500 text-sm mt-2 underline w-full text-center'>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
