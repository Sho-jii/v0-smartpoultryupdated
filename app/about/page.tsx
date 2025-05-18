"use client"

import { useState } from "react"
import NavigationMenu from "@/components/navigation-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Mail, Linkedin, Globe, Code, Wrench, FileText, Brain } from "lucide-react"

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState("system")

  return (
    <div className="container mx-auto px-4 py-8 transition-colors duration-200 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <NavigationMenu />

      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white mb-2">About Our System</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Learn about the Smart IoT-Based Poultry Farming Solution and the team behind it
        </p>
      </div>

      <Tabs defaultValue="system" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="system">About the System</TabsTrigger>
          <TabsTrigger value="team">Our Team</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Smart IoT-Based Poultry Farming Solution</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              The Smart IoT-Based Poultry Farming Solution (SIPFS) aims to revolutionize traditional poultry farming by
              introducing automation, real-time monitoring, and data-driven management through Internet of Things (IoT)
              technology. This system integrates environmental sensors, actuators, and a web interface to monitor and
              control temperature, humidity, water, and feed levels in poultry houses.
            </p>

            <h3 className="text-xl font-semibold mb-3 dark:text-white">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Environmental Monitoring</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Real-time tracking of temperature, humidity, and other environmental factors critical for poultry
                  health.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Intelligent Feeding System</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Automated feeding based on schedules and poultry age, with manual override capabilities.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Water Management</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Monitoring of water levels, automated refilling, and hydration tracking for optimal poultry health.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Remote Monitoring</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Access to farm conditions from anywhere through a responsive web dashboard with real-time updates.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3 dark:text-white">Technology Stack</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Frontend</h4>
                <ul className="list-disc list-inside text-blue-700 dark:text-blue-400 text-sm space-y-1">
                  <li>Next.js (React Framework)</li>
                  <li>Tailwind CSS</li>
                  <li>TypeScript</li>
                  <li>Recharts for data visualization</li>
                </ul>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-md">
                <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Backend</h4>
                <ul className="list-disc list-inside text-green-700 dark:text-green-400 text-sm space-y-1">
                  <li>Firebase Realtime Database</li>
                  <li>Firebase Authentication</li>
                  <li>Server-side rendering</li>
                  <li>Real-time data synchronization</li>
                </ul>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-md">
                <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-2">Hardware</h4>
                <ul className="list-disc list-inside text-orange-700 dark:text-orange-400 text-sm space-y-1">
                  <li>ESP32 microcontroller</li>
                  <li>DHT11 temperature/humidity sensors</li>
                  <li>Ultrasonic sensors for level detection</li>
                  <li>Servo motors and relays for automation</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jarib Sioco */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center">
                  <Code className="mr-2 text-blue-500" size={20} />
                  Jarib Sioco
                </CardTitle>
                <CardDescription>Web Developer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=96&width=96"
                      alt="Jarib Sioco"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Developed the web interface and dashboard for the Smart Poultry Farming Solution, implementing the
                      frontend components and Firebase integration.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-start space-x-2 pt-0">
                <a
                  href="mailto:jarib.sioco@example.com"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Mail size={16} />
                </a>
                <a
                  href="https://github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Github size={16} />
                </a>
                <a
                  href="https://linkedin.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Linkedin size={16} />
                </a>
              </CardFooter>
            </Card>

            {/* Ralf Carlo Legaspi */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center">
                  <Wrench className="mr-2 text-green-500" size={20} />
                  Ralf Carlo Legaspi
                </CardTitle>
                <CardDescription>Hardware Engineer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=96&width=96"
                      alt="Ralf Carlo Legaspi"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Designed and built the hardware components of the system, including sensor integration,
                      microcontroller programming, and physical automation mechanisms.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-start space-x-2 pt-0">
                <a
                  href="mailto:ralf.legaspi@example.com"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Mail size={16} />
                </a>
                <a
                  href="https://github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Github size={16} />
                </a>
                <a
                  href="https://linkedin.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Linkedin size={16} />
                </a>
              </CardFooter>
            </Card>

            {/* Grace Melody Manalo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center">
                  <FileText className="mr-2 text-purple-500" size={20} />
                  Grace Melody Manalo
                </CardTitle>
                <CardDescription>Documentation & System Analyst</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=96&width=96"
                      alt="Grace Melody Manalo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Led the documentation efforts and provided valuable recommendations for system improvements based
                      on research and user feedback analysis.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-start space-x-2 pt-0">
                <a
                  href="mailto:grace.manalo@example.com"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Mail size={16} />
                </a>
                <a
                  href="https://linkedin.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Linkedin size={16} />
                </a>
                <a
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Globe size={16} />
                </a>
              </CardFooter>
            </Card>

            {/* Monica Bacay */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center">
                  <Brain className="mr-2 text-amber-500" size={20} />
                  Monica Bacay
                </CardTitle>
                <CardDescription>Documentation & System Analyst</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <img
                      src="/placeholder.svg?height=96&width=96"
                      alt="Monica Bacay"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Contributed to the documentation and provided critical insights for system design and
                      implementation, focusing on usability and practical applications.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-start space-x-2 pt-0">
                <a
                  href="mailto:monica.bacay@example.com"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Mail size={16} />
                </a>
                <a
                  href="https://linkedin.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Linkedin size={16} />
                </a>
                <a
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Globe size={16} />
                </a>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
