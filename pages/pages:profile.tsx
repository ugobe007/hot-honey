{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import React from 'react'\
import \{ FileUploader \} from '../components/file-uploader'\
import \{ Button \} from "@/components/ui/button"\
import \{ Input \} from "@/components/ui/input"\
import \{ Label \} from "@/components/ui/label"\
\
export default function Profile() \{\
  const handleFilesSelected = (files: File[]) => \{\
    console.log('Selected files:', files)\
    // Handle file upload logic here\
  \}\
\
  return (\
    <div className="container mx-auto px-4 max-w-2xl">\
      <h1 className="text-3xl font-bold text-center my-8">Your Profile</h1>\
      <form className="space-y-6">\
        <div>\
          <Label htmlFor="name">Name</Label>\
          <Input id="name" placeholder="Your name" />\
        </div>\
        <div>\
          <Label htmlFor="email">Email</Label>\
          <Input id="email" type="email" placeholder="Your email" />\
        </div>\
        <div>\
          <Label>Upload Documents</Label>\
          <FileUploader \
            onFilesSelected=\{handleFilesSelected\}\
            maxFiles=\{3\}\
            acceptedFileTypes=\{['.pdf', '.doc', '.docx']\}\
          />\
        </div>\
        <Button type="submit" className="w-full">Update Profile</Button>\
      </form>\
    </div>\
  )\
\}}