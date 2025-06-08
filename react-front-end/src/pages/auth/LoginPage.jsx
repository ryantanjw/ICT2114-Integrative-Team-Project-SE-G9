import React, { useState } from "react";
import Button from "../../components/ButtonGroup";
import InputGroup from "../../components/InputGroup";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="bg-white  w-screen">
      <div className="flex justify-center h-screen">
         {/* Left form panel */}
        <div className="flex flex-col items-center justify-start w-full px-2 mx-auto xl:w-1/3">
          <div className="w-full p-8 space-y-6 bg-white">
              <div>
                <div className="flex justify-center my-30">
                  <img
                    src="/SIT_Logo.svg"
                    alt="SIT Logo"
                    className="h-20"
                  />
                </div>
                <div className="text-start mt-20">
                  <h2 className="text-4xl font-bold text-gray-700">
                    Login
                  </h2>
                  <p className="mt-5 text-gray-500">
                    Log in using your registered SIT email address and associated password to access the system.
                  </p>
                </div>
              </div>

            <div className="mt-10">
              <form>
                <InputGroup
                label="Email Address"
                id="email"
                type="email"
                placeholder="example@sit.singaporetech.edu.sg"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-6"
                />
        
                <InputGroup
                label="Password"
                id="password"
                type="password"
                placeholder="Your Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                action={<a href="/auth/forgot-password">Forgot password?</a>}
                className="mt-6"
                />

                <div className="mt-6 font-light">
                    <Button type="submit">Sign in</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* Right image panel */}
        <div className="hidden xl:block xl:w-2/3 bg-[#F7FAFC] h-screen overflow-hidden p-10">
          <div className="w-full h-full overflow-hidden rounded-xl">
            <img
              src="https://www.singaporetech.edu.sg/sites/default/files/2023-07/PunggolCampus_CampusCourtSWview.jpg"
              alt="SIT Campus"
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}