import { useEffect, useState } from 'react'

import { Html5Qrcode } from 'html5-qrcode'

import Sidebar from '../../components/Sidebar'

import Navbar from '../../components/Navbar'

import { supabase } from '../../supabase/client'

function Attendance() {

  const [message, setMessage] =
    useState('')

  useEffect(() => {

    let html5QrCode

    async function startScanner() {

      try {

        html5QrCode =
          new Html5Qrcode('reader')

        await html5QrCode.start(
          {
            facingMode: 'environment',
          },

          {
            fps: 10,

            qrbox: {
              width: 250,
              height: 250,
            },
          },

          async (decodedText) => {

            const { error } =
              await supabase
                .from('attendances')
                .insert([
                  {
                    member_id:
                      decodedText,
                  },
                ])

            if (!error) {

              setMessage(
                'Presença registrada com sucesso'
              )
            }
          },

          () => {}
        )

      } catch (err) {

        console.log(err)

        setMessage(
          'Erro ao acessar câmera'
        )
      }
    }

    startScanner()

    return () => {

      if (
        html5QrCode &&
        html5QrCode.isScanning
      ) {

        html5QrCode
          .stop()
          .catch(() => {})
      }
    }

  }, [])

  return (

    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen transition">

      <Sidebar />

      <div className="flex-1 p-6">

        <Navbar />

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md mt-6 min-h-[600px] transition">

          <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">

            Scanner de Presença

          </h1>

          <div
            id="reader"
            className="w-full max-w-md mx-auto rounded-xl overflow-hidden"
          ></div>

          <div className="mt-6 text-green-600 font-bold text-center">

            {message}

          </div>

        </div>

      </div>

    </div>
  )
}

export default Attendance