{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import React, \{ useReducer, useState \} from 'react'\
import \{ Button \} from "@/components/ui/button"\
import \{ Input \} from "@/components/ui/input"\
\
type Todo = \{ id: number; text: string; completed: boolean \}\
type Action = \
  | \{ type: 'ADD_TODO'; payload: string \}\
  | \{ type: 'TOGGLE_TODO'; payload: number \}\
  | \{ type: 'REMOVE_TODO'; payload: number \}\
\
function todoReducer(state: Todo[], action: Action): Todo[] \{\
  switch (action.type) \{\
    case 'ADD_TODO':\
      return [...state, \{ id: Date.now(), text: action.payload, completed: false \}]\
    case 'TOGGLE_TODO':\
      return state.map(todo =>\
        todo.id === action.payload ? \{ ...todo, completed: !todo.completed \} : todo\
      )\
    case 'REMOVE_TODO':\
      return state.filter(todo => todo.id !== action.payload)\
    default:\
      return state\
  \}\
\}\
\
export default function TodoList() \{\
  const [todos, dispatch] = useReducer(todoReducer, [])\
  const [input, setInput] = useState('')\
\
  const handleSubmit = (e: React.FormEvent) => \{\
    e.preventDefault()\
    if (input.trim()) \{\
      dispatch(\{ type: 'ADD_TODO', payload: input.trim() \})\
      setInput('')\
    \}\
  \}\
\
  return (\
    <div className="max-w-md mx-auto mt-8 space-y-4">\
      <form onSubmit=\{handleSubmit\} className="flex space-x-2">\
        <Input\
          value=\{input\}\
          onChange=\{(e) => setInput(e.target.value)\}\
          placeholder="Add a todo"\
        />\
        <Button type="submit">Add</Button>\
      </form>\
      <ul className="space-y-2">\
        \{todos.map(todo => (\
          <li key=\{todo.id\} className="flex items-center justify-between p-2 border rounded">\
            <span\
              className=\{`flex-grow $\{todo.completed ? 'line-through text-gray-500' : ''\}`\}\
              onClick=\{() => dispatch(\{ type: 'TOGGLE_TODO', payload: todo.id \})\}\
            >\
              \{todo.text\}\
            </span>\
            <Button\
              variant="destructive"\
              size="sm"\
              onClick=\{() => dispatch(\{ type: 'REMOVE_TODO', payload: todo.id \})\}\
            >\
              Remove\
            </Button>\
          </li>\
        ))\}\
      </ul>\
    </div>\
  )\
\}}