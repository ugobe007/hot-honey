{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import React, \{ useState, useRef \} from 'react'\
import \{ Button \} from "@/components/ui/button"\
import \{ Input \} from "@/components/ui/input"\
import \{ Label \} from "@/components/ui/label"\
import \{ X, Upload \} from 'lucide-react'\
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
      <div className="flex items-center justify-center w-full">\
        <Label\
          htmlFor="file-upload"\
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"\
        >\
          <div className="flex flex-col items-center justify-center pt-5 pb-6">\
            <Upload className="w-8 h-8 mb-3 text-gray-400" />\
            <p className="mb-2 text-sm text-gray-500">\
              <span className="font-semibold">Click to upload</span> or drag and drop\
            </p>\
            <p className="text-xs text-gray-500">\
              \{acceptedFileTypes.join(', ')\} (Max \{maxFiles\} files)\
            </p>\
          </div>\
          <Input\
            id="file-upload"\
            type="file"\
            className="hidden"\
            onChange=\{handleFileChange\}\
            accept=\{acceptedFileTypes.join(',')\}\
            multiple\
            ref=\{fileInputRef\}\
          />\
        </Label>\
      </div>\
      \{selectedFiles.length > 0 && (\
        <div className="space-y-2">\
          <h3 className="font-semibold">Selected Files:</h3>\
          <ul className="space-y-2">\
            \{selectedFiles.map((file, index) => (\
              <li key=\{index\} className="flex items-center justify-between bg-gray-100 p-2 rounded">\
                <span className="text-sm truncate">\{file.name\}</span>\
                <Button\
                  variant="ghost"\
                  size="sm"\
                  onClick=\{() => removeFile(index)\}\
                  className="text-red-500 hover:text-red-700"\
                >\
                  <X className="h-4 w-4" />\
                </Button>\
              </li>\
            ))\}\
          </ul>\
        </div>\
      )\}\
    </div>\
  )\
\}}