'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '@/app/auth/AuthContext';

export default function TasksPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [tasks, setTasks] = useState<{ [key: string]: { id: string; text: string }[] }>({});
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      const categoriesQuery = query(
        collection(db, 'taskCategories'),
        where('ownerId', '==', user?.uid)
      );
      const querySnapshot = await getDocs(categoriesQuery);
      const loadedCategories: string[] = [];
      querySnapshot.forEach((doc) => {
        loadedCategories.push(doc.data().name);
      });
      setCategories(loadedCategories);

      // Load tasks for each category
      const tasksMap: { [key: string]: { id: string; text: string }[] } = {};
      for (const category of loadedCategories) {
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('ownerId', '==', user?.uid),
          where('category', '==', category)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksMap[category] = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          text: doc.data().text
        }));
      }
      setTasks(tasksMap);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim() || !user) return;
    try {
      await addDoc(collection(db, 'taskCategories'), {
        name: newCategory,
        ownerId: user.uid
      });
      setCategories([...categories, newCategory]);
      setTasks({ ...tasks, [newCategory]: [] });
      setNewCategory('');
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const addTask = async () => {
    if (!newTask.trim() || !selectedCategory || !user) return;
    try {
      const docRef = await addDoc(collection(db, 'tasks'), {
        text: newTask,
        category: selectedCategory,
        ownerId: user.uid
      });
      setTasks({
        ...tasks,
        [selectedCategory]: [...(tasks[selectedCategory] || []), { id: docRef.id, text: newTask }]
      });
      setNewTask('');
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const deleteCategory = async (categoryName: string) => {
    try {
      const categoryQuery = query(
        collection(db, 'taskCategories'),
        where('ownerId', '==', user?.uid),
        where('name', '==', categoryName)
      );
      const querySnapshot = await getDocs(categoryQuery);
      
      // Delete the category document
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      // Delete all tasks in this category
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', user?.uid),
        where('category', '==', categoryName)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      setCategories(categories.filter(cat => cat !== categoryName));
      const { [categoryName]: removed, ...remainingTasks } = tasks;
      setTasks(remainingTasks);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const deleteAllTasks = async (categoryName: string) => {
    try {
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', user?.uid),
        where('category', '==', categoryName)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      setTasks({
        ...tasks,
        [categoryName]: []
      });
    } catch (error) {
      console.error('Error deleting all tasks:', error);
    }
  };

  const deleteTask = async (categoryName: string, taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks({
        ...tasks,
        [categoryName]: tasks[categoryName].filter(task => task.id !== taskId)
      });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const copyAllTasks = (categoryName: string) => {
    const categoryTasks = tasks[categoryName];
    if (categoryTasks) {
      const taskTexts = categoryTasks.map(task => task.text).join('\n');
      navigator.clipboard.writeText(taskTexts);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Task Management</h1>
      
      {/* Add Category Section */}
      <div className="mb-6">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New Category"
          className="border p-2 rounded mr-2"
        />
        <button
          onClick={addCategory}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Category
        </button>
      </div>

      {/* Add Task Section */}
      <div className="mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border p-2 rounded mr-2"
        >
          <option value="">Select Category</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New Task"
          className="border p-2 rounded mr-2"
        />
        <button
          onClick={addTask}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Add Task
        </button>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div key={category} className="border rounded p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{category}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => copyAllTasks(category)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Copy All
                </button>
                <button
                  onClick={() => deleteAllTasks(category)}
                  className="text-yellow-500 hover:text-yellow-600"
                >
                  Delete All
                </button>
                <button
                  onClick={() => deleteCategory(category)}
                  className="text-red-500 hover:text-red-600"
                >
                  Delete Category
                </button>
              </div>
            </div>
            <ul>
              {tasks[category]?.map((task) => (
                <li key={task.id} className="flex justify-between items-center mb-2">
                  <span>{task.text}</span>
                  <button
                    onClick={() => deleteTask(category, task.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}