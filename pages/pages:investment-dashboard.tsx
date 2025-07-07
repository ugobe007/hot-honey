{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import React from 'react'\
import InvestorPortfolio from '../components/investor-portfolio'\
import InvestmentClub from '../components/investment-club'\
\
export default function InvestorDashboard() \{\
  return (\
    <div className="container mx-auto px-4">\
      <h1 className="text-3xl font-bold text-center my-8">Investor Dashboard</h1>\
      <div className="grid gap-8 md:grid-cols-2">\
        <div>\
          <h2 className="text-2xl font-semibold mb-4">Your Portfolio</h2>\
          <InvestorPortfolio />\
        </div>\
        <div>\
          <h2 className="text-2xl font-semibold mb-4">Investment Clubs</h2>\
          <InvestmentClub />\
        </div>\
      </div>\
    </div>\
  )\
\}}