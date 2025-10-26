{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import React, \{ useState, useRef \} from 'react'\
import \{ Button \} from "@/components/ui/button"\
import \{ Input \} from "@/components/ui/input"\
import \{ X \} from 'lucide-react'\
\
interface FileUploaderProps \{\
  onFilesSelected: (files: File[]) => void\
  maxFiles?: number\
  acceptedFileTypes?: string[]\
\}\
\
export function FileUploader(\{ \
  onFilesSelected, \
  maxFiles = 5, \
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.txt']\
\}: FileUploaderProps) \{\
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])\
  const fileInputRef = useRef<HTMLInputElement>(null)\
\
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => \{\
    const files = Array.from(event.target.files || [])\
    const validFiles = files.filter(file => \{\
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()\
      return acceptedFileTypes.includes(fileExtension)\
    \})\
\
    if (validFiles.length + selectedFiles.length > maxFiles) \{\
      alert(`You can only upload a maximum of $\{maxFiles\} files.`)\
      return\
    \}\
\
    setSelectedFiles(prevFiles => [...prevFiles, ...validFiles])\
    onFilesSelected([...selectedFiles, ...validFiles])\
\
    if (fileInputRef.current) \{\
      fileInputRef.current.value = ''\
    \}\
  \}\
\
  const removeFile = (index: number) => \{\
    setSelectedFiles(prevFiles => \{\
      const newFiles = [...prevFiles]\
      newFiles.splice(index, 1)\
      onFilesSelected(newFiles)\
      return newFiles\
    \})\
  \}\
\
  return (\
    <div className="space-y-4">\
      <div className="flex items-center space-x-2">\
        <Input\
          type="file"\
          ref=\{fileInputRef\}\
          onChange=\{handleFileChange\}\
          accept=\{acceptedFileTypes.join(',')\}\
          multiple\
          className="hidden"\
          id="file-upload"\
        />\
        <Button\
          onClick=\{() => fileInputRef.current?.click()\}\
          variant="outline"\
        >\
          Select Files\
        </Button>\
        <span className="text-sm text-gray-500">\
          \{selectedFiles.length\} / \{maxFiles\} files selected\
        </span>\
      </div>\
      \{selectedFiles.length > 0 && (\
        <ul className="space-y-2">\
          \{selectedFiles.map((file, index) => (\
            <li key=\{index\} className="flex items-center justify-between bg-gray-100 p-2 rounded">\
              <span className="text-sm truncate">\{file.name\}</span>\
              <Button\
                variant="ghost"\
                size="sm"\
                onClick=\{() => removeFile(index)\}\
                aria-label=\{`Remove $\{file.name\}`\}\
              >\
                <X className="h-4 w-4" />\
              </Button>\
            </li>\
          ))\}\
        </ul>\
      )\}\
      <p className="text-xs text-gray-500">\
        Accepted file types: \{acceptedFileTypes.join(', ')\}\
      </p>\
    </div>\
  )\
\}}