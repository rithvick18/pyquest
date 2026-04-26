
import { Module, Theme } from './types';

export const CURRICULUM: Module[] = [
  // PATH 1: THE INITIATE (Foundations)
  {
    id: "module-intro",
    title: "First Steps",
    path: "Path 1: The Initiate",
    lessons: [
      { 
        id: "intro-hello", 
        title: "Hello World", 
        module: "First Steps", 
        difficulty: "Beginner", 
        description: "Write your first Python program and understand the print function.",
        subtopics: ["print()", "Strings", "Syntax Errors"]
      },
      { 
        id: "intro-vars", 
        title: "Variables", 
        module: "First Steps", 
        difficulty: "Beginner", 
        description: "Learn how to store data in variables.",
        subtopics: ["Assignment", "Naming Conventions", "Reassigning"]
      },
      { 
        id: "intro-types", 
        title: "Data Types", 
        module: "First Steps", 
        difficulty: "Beginner", 
        description: "Explore Integers, Floats, Strings, and Booleans.",
        subtopics: ["type()", "int", "float", "str", "bool"]
      }
    ]
  },
  {
    id: "module-strings",
    title: "String Mastery",
    path: "Path 1: The Initiate",
    lessons: [
      {
        id: "str-concat",
        title: "String Operations",
        module: "String Mastery",
        difficulty: "Beginner",
        description: "Combining and repeating strings.",
        subtopics: ["Concatenation (+)", "Repetition (*)", "f-strings"]
      },
      {
        id: "str-methods",
        title: "String Methods",
        module: "String Mastery",
        difficulty: "Beginner",
        description: "Transforming text with built-in methods.",
        subtopics: [".upper()", ".lower()", ".strip()", ".replace()"]
      }
    ]
  },
  {
    id: "module-logic",
    title: "Logic & Control",
    path: "Path 1: The Initiate",
    lessons: [
      { 
        id: "logic-bools", 
        title: "Booleans", 
        module: "Logic & Control", 
        difficulty: "Beginner", 
        description: "Understanding truth values and comparison.",
        subtopics: ["True/False", "==, !=, >, <", "and, or, not"]
      },
      { 
        id: "logic-if", 
        title: "If Statements", 
        module: "Logic & Control", 
        difficulty: "Beginner", 
        description: "Making decisions in your code.",
        subtopics: ["if", "else", "elif", "Indentation"]
      },
      {
        id: "logic-match",
        title: "Match Case",
        module: "Logic & Control", 
        difficulty: "Beginner",
        description: "Modern pattern matching (Python 3.10+).",
        subtopics: ["match", "case", "wildcards"]
      }
    ]
  },

  // PATH 2: THE APPRENTICE (Data Structures & Loops)
  {
    id: "module-loops",
    title: "Loops",
    path: "Path 2: The Apprentice",
    lessons: [
      { 
        id: "loop-for", 
        title: "For Loops", 
        module: "Loops", 
        difficulty: "Beginner", 
        description: "Iterating over sequences.",
        subtopics: ["for ... in", "range()", "iterating lists"]
      },
      { 
        id: "loop-while", 
        title: "While Loops", 
        module: "Loops", 
        difficulty: "Beginner", 
        description: "Repeating code while a condition is true.",
        subtopics: ["while syntax", "infinite loops", "counters"]
      },
      {
        id: "loop-control",
        title: "Loop Control",
        module: "Loops",
        difficulty: "Intermediate",
        description: "Managing loop execution flow.",
        subtopics: ["break", "continue", "pass", "nested loops"]
      }
    ]
  },
  {
    id: "module-lists",
    title: "Lists",
    path: "Path 2: The Apprentice",
    lessons: [
      { 
        id: "list-create", 
        title: "Creating Lists", 
        module: "Lists", 
        difficulty: "Beginner", 
        description: "Working with ordered collections.",
        subtopics: ["[] syntax", "mixed types", "indexing"]
      },
      { 
        id: "list-slicing", 
        title: "Slicing Lists", 
        module: "Lists", 
        difficulty: "Intermediate", 
        description: "Accessing parts of a list.",
        subtopics: ["start:stop:step", "negative indexing", "reversing"]
      },
      { 
        id: "list-methods", 
        title: "List Methods", 
        module: "Lists", 
        difficulty: "Intermediate", 
        description: "Adding, removing, and sorting items.",
        subtopics: [".append()", ".pop()", ".insert()", ".sort()"]
      }
    ]
  },
  {
    id: "module-dicts",
    title: "Dictionaries",
    path: "Path 2: The Apprentice",
    lessons: [
      { 
        id: "dict-intro", 
        title: "Key-Value Pairs", 
        module: "Dictionaries", 
        difficulty: "Intermediate", 
        description: "Storing data in key-value structures.",
        subtopics: ["{}", "accessing keys", "adding items"]
      },
      { 
        id: "dict-ops", 
        title: "Dict Operations", 
        module: "Dictionaries", 
        difficulty: "Intermediate", 
        description: "Iterating and modifying dictionaries.",
        subtopics: [".keys()", ".values()", ".items()", "getting defaults"]
      }
    ]
  },

  // PATH 3: THE DEVELOPER (Functions & Modular Code)
  {
    id: "module-functions",
    title: "Functions",
    path: "Path 3: The Developer",
    lessons: [
      { 
        id: "func-def", 
        title: "Defining Functions", 
        module: "Functions", 
        difficulty: "Intermediate", 
        description: "Creating reusable blocks of code.",
        subtopics: ["def", "calling functions", "docstrings"]
      },
      { 
        id: "func-args", 
        title: "Arguments", 
        module: "Functions", 
        difficulty: "Intermediate", 
        description: "Passing data to functions.",
        subtopics: ["positional args", "keyword args", "default values"]
      },
      { 
        id: "func-return", 
        title: "Return Values", 
        module: "Functions", 
        difficulty: "Intermediate", 
        description: "Getting data back from functions.",
        subtopics: ["return statement", "returning multiple values"]
      }
    ]
  },
  {
    id: "module-advanced-funcs",
    title: "Functional Power",
    path: "Path 3: The Developer",
    lessons: [
      { 
        id: "func-lambda", 
        title: "Lambda Functions", 
        module: "Functional Power", 
        difficulty: "Intermediate", 
        description: "Anonymous single-line functions.",
        subtopics: ["lambda syntax", "sorting with key"]
      },
      { 
        id: "func-scope", 
        title: "Scope", 
        module: "Functional Power", 
        difficulty: "Advanced", 
        description: "Understanding variable visibility.",
        subtopics: ["global", "local", "nonlocal"]
      },
      {
        id: "func-comprehensions",
        title: "Comprehensions",
        module: "Functional Power",
        difficulty: "Intermediate",
        description: "Pythonic way to create lists.",
        subtopics: ["List Comprehension", "Dict Comprehension"]
      }
    ]
  },

  // PATH 4: THE ARCHITECT (OOP & Error Handling)
  {
    id: "module-oop",
    title: "Object Oriented",
    path: "Path 4: The Architect",
    lessons: [
      { 
        id: "oop-class", 
        title: "Classes & Objects", 
        module: "Object Oriented", 
        difficulty: "Intermediate", 
        description: "Creating blueprints for objects.",
        subtopics: ["class keyword", "instances", "attributes"]
      },
      { 
        id: "oop-methods", 
        title: "Methods & Self", 
        module: "Object Oriented", 
        difficulty: "Intermediate", 
        description: "Adding behavior to classes.",
        subtopics: ["instance methods", "the self parameter"]
      },
      { 
        id: "oop-init", 
        title: "The Constructor", 
        module: "Object Oriented", 
        difficulty: "Intermediate", 
        description: "Initializing objects with __init__.",
        subtopics: ["__init__", "instance variables"]
      }
    ]
  },
  {
    id: "module-advanced-oop",
    title: "Advanced OOP",
    path: "Path 4: The Architect",
    lessons: [
      { 
        id: "oop-inherit", 
        title: "Inheritance", 
        module: "Advanced OOP", 
        difficulty: "Advanced", 
        description: "Creating hierarchies of classes.",
        subtopics: ["parent/child", "super()", "overriding"]
      },
      { 
        id: "oop-poly", 
        title: "Polymorphism", 
        module: "Advanced OOP", 
        difficulty: "Advanced", 
        description: "Using common interfaces for different types.",
        subtopics: ["duck typing", "method overriding"]
      }
    ]
  },
  {
    id: "module-errors",
    title: "Robustness",
    path: "Path 4: The Architect",
    lessons: [
      { 
        id: "err-try", 
        title: "Try & Except", 
        module: "Robustness", 
        difficulty: "Intermediate", 
        description: "Handling runtime errors gracefully.",
        subtopics: ["try/except block", "catching specific errors"]
      },
      { 
        id: "err-raise", 
        title: "Raising Errors", 
        module: "Robustness", 
        difficulty: "Advanced", 
        description: "Creating your own error conditions.",
        subtopics: ["raise keyword", "assert", "custom exceptions"]
      }
    ]
  },

  // PATH 5: THE SPECIALIST (Libraries & Tools)
  {
    id: "module-stdlib",
    title: "Standard Library",
    path: "Path 5: The Specialist",
    lessons: [
      { 
        id: "lib-math", 
        title: "Math & Random", 
        module: "Standard Library", 
        difficulty: "Intermediate", 
        description: "Using built-in mathematical tools.",
        subtopics: ["import math", "random.choice", "random.randint"]
      },
      { 
        id: "lib-datetime", 
        title: "Date & Time", 
        module: "Standard Library", 
        difficulty: "Intermediate", 
        description: "Working with dates and times.",
        subtopics: ["datetime.now()", "timedelta", "formatting dates"]
      }
    ]
  },
  {
    id: "module-files",
    title: "File Handling",
    path: "Path 5: The Specialist",
    lessons: [
      { 
        id: "file-read", 
        title: "Reading Files", 
        module: "File Handling", 
        difficulty: "Advanced", 
        description: "Opening and reading text files.",
        subtopics: ["open()", ".read()", ".readlines()"]
      },
      { 
        id: "file-write", 
        title: "Writing Files", 
        module: "File Handling", 
        difficulty: "Advanced", 
        description: "Creating and appending to files.",
        subtopics: ["mode 'w' vs 'a'", "context manager (with)"]
      }
    ]
  }
];

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'PyQuest Dark',
    type: 'dark',
    fontFamily: "'Inter', sans-serif",
    colors: {
      bgPrimary: '#0f172a', // Slate 900
      bgSecondary: '#1e293b', // Slate 800
      bgTertiary: '#334155', // Slate 700
      textPrimary: '#f1f5f9', // Slate 100
      textSecondary: '#94a3b8', // Slate 400
      accentPrimary: '#3b82f6', // Blue 500
      accentHover: '#2563eb', // Blue 600
      border: '#1e293b', // Slate 800
      codeBg: '#020617', // Slate 950
    }
  },
  {
    id: 'claude',
    name: 'Claude Inspired',
    type: 'light',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif", // Approximating Claude's clean serif/sans mix
    colors: {
      bgPrimary: '#f5f4ef', // Warm Bisque
      bgSecondary: '#e8e6df', // Darker Bisque
      bgTertiary: '#ffffff', // White
      textPrimary: '#3f3f3f', // Dark Grey
      textSecondary: '#666666', // Medium Grey
      accentPrimary: '#d97757', // Terracotta
      accentHover: '#b85c3f', // Dark Terracotta
      border: '#d0cfc8', // Light Grey Border
      codeBg: '#f0efe9', // Very light grey
    }
  },
  {
    id: 'gemini',
    name: 'Gemini Blue',
    type: 'light',
    fontFamily: "'Inter', sans-serif",
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f0f4f9', // Light Blue/Grey
      bgTertiary: '#dfe4ea',
      textPrimary: '#1f1f1f',
      textSecondary: '#444746',
      accentPrimary: '#1a73e8', // Google Blue
      accentHover: '#1557b0',
      border: '#e2e8f0',
      codeBg: '#f1f5f9',
    }
  },
  {
    id: 'perplexity',
    name: 'Perplexity Dark',
    type: 'dark',
    fontFamily: "'Inter', sans-serif",
    colors: {
      bgPrimary: '#191a1a', // Almost Black
      bgSecondary: '#202222', // Dark Grey
      bgTertiary: '#2d2f2f',
      textPrimary: '#e8e8e8',
      textSecondary: '#8d9191',
      accentPrimary: '#1fa298', // Teal
      accentHover: '#177a72',
      border: '#2d2f2f',
      codeBg: '#111111',
    }
  },
  {
    id: 'apple',
    name: 'Cupertino',
    type: 'light',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    colors: {
      bgPrimary: '#fbfbfd', // Apple Off-white
      bgSecondary: '#f5f5f7', // Light Grey
      bgTertiary: '#ffffff',
      textPrimary: '#1d1d1f', // Nearly Black
      textSecondary: '#86868b', // Grey
      accentPrimary: '#0066cc', // Apple Blue
      accentHover: '#004499',
      border: '#d2d2d7',
      codeBg: '#f5f5f7',
    }
  },
  {
    id: 'nvidia',
    name: 'GeForce',
    type: 'dark',
    fontFamily: "'Inter', sans-serif",
    colors: {
      bgPrimary: '#000000', // True Black
      bgSecondary: '#1a1a1a', // Dark Grey
      bgTertiary: '#2b2b2b',
      textPrimary: '#ffffff',
      textSecondary: '#999999',
      accentPrimary: '#76b900', // Nvidia Green
      accentHover: '#5e9400',
      border: '#333333',
      codeBg: '#0a0a0a',
    }
  },
  {
    id: 'matrix',
    name: 'The Construct',
    type: 'dark',
    fontFamily: "'Fira Code', monospace",
    colors: {
      bgPrimary: '#0d0208', // Very dark
      bgSecondary: '#001a00', // Dark Green Tint
      bgTertiary: '#002b00',
      textPrimary: '#00ff41', // Matrix Green
      textSecondary: '#008f11', // Darker Green
      accentPrimary: '#00ff41',
      accentHover: '#00cc33',
      border: '#003b00',
      codeBg: '#000000',
    }
  }
];
