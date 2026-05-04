"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper/types";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const templateImages = [
  "/cpl/opsi-template-1.jpg",
  "/cpl/opsi-template-2.jpg",
  "/cpl/opsi-template-3.jpg",
  "/cpl/opsi-template-4.jpg",
];

export default function CplTemplatePage() {
  const swiperRef = useRef<SwiperType | null>(null);
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = Number(params.get("template"));
    let initialTemplate = 1;

    if (
      Number.isInteger(fromQuery) &&
      fromQuery >= 1 &&
      fromQuery <= templateImages.length
    ) {
      initialTemplate = fromQuery;
    } else {
      const fromStorage = Number(window.localStorage.getItem("cpl-template"));
      if (
        Number.isInteger(fromStorage) &&
        fromStorage >= 1 &&
        fromStorage <= templateImages.length
      ) {
        initialTemplate = fromStorage;
      }
    }

    setSelectedTemplate(initialTemplate);
    swiperRef.current?.slideToLoop(initialTemplate - 1, 0);
  }, []);

  const syncSelection = (templateNumber: number) => {
    setSelectedTemplate(templateNumber);
    window.localStorage.setItem("cpl-template", String(templateNumber));
    const params = new URLSearchParams(window.location.search);
    params.set("template", String(templateNumber));
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  };

  return (
    <main className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-3 py-6 sm:px-6">
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/cpl/bg.jpg)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/cpl/frame.png)" }}
        aria-hidden
      />

      <div className="absolute top-[5rem] left-0 right-0 mx-auto w-[135px]">
        <Image
          src="/cpl/cpl-logo.png"
          alt=""
          width={280}
          height={280}
          priority
          className="h-auto w-full"
          sizes="86px"
        />
      </div>

      <div className="relative flex w-[90vw] flex-col items-center justify-between mt-[12rem]">
        <Image
          src="/cpl/select-option.png"
          alt=""
          width={720}
          height={110}
          className="h-auto w-[80%] mb-[3rem]"
          sizes="(max-width: 640px) 86vw, 420px"
        />

        <div className="relative w-full">
          <button
            ref={prevRef}
            type="button"
            className="swiper-prev absolute left-0 top-1/2 z-20 -translate-y-1/2 outline-none"
            aria-label="Previous template"
          >
            <Image
              src="/cpl/arrow-prev.png"
              alt=""
              width={340}
              height={340}
              className="h-auto w-[58px] sm:w-[170px]"
              sizes="170px"
            />
          </button>
          <button
            ref={nextRef}
            type="button"
            className="swiper-next absolute right-0 top-1/2 z-20 -translate-y-1/2 outline-none"
            aria-label="Next template"
          >
            <Image
              src="/cpl/arrow-next.png"
              alt=""
              width={340}
              height={340}
              className="h-auto w-[58px] sm:w-[170px]"
              sizes="170px"
            />
          </button>
          <Swiper
            modules={[Navigation, Pagination]}
            centeredSlides
            loop
            slidesPerView={1.2}
            spaceBetween={50}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            pagination={{ clickable: true }}
            onBeforeInit={(swiper) => {
              if (swiper.params.navigation && typeof swiper.params.navigation !== "boolean") {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
              }
            }}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              syncSelection(swiper.realIndex + 1);
            }}
            breakpoints={{
              420: { slidesPerView: 1.35, spaceBetween: 14 },
              640: { slidesPerView: 1.5, spaceBetween: 18 },
            }}
            className="w-full"
          >
            {templateImages.map((src, index) => (
              <SwiperSlide key={src}>
                <button
                  type="button"
                  onClick={() => {
                    const nextTemplate = index + 1;
                    swiperRef.current?.slideToLoop(index);
                    syncSelection(nextTemplate);
                  }}
                  className="block w-full"
                  aria-label={`Pilih template ${index + 1}`}
                >
                  <div
                    className={`relative mx-auto aspect-[7/10] w-full overflow-hidden border-[20px] bg-black/5 ${
                      selectedTemplate === index + 1 ? "border-black" : "border-white"
                    }`}
                  >
                  <Image src={src} alt="" fill className="object-cover" sizes="60vw" />
                  </div>
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <Link href="/cpl/cam2" aria-label="Continue" className="mt-[4rem] block w-[94%]">
          <Image
            src="/cpl/btn-continue.png"
            alt=""
            width={1024}
            height={216}
            className="h-auto w-full"
            sizes="(max-width: 640px) 94vw, 640px"
          />
        </Link>

        <Image
          src="/cpl/footer.png"
          alt=""
          width={824}
          height={184}
          className="h-auto w-[78%] max-w-[350px]"
          sizes="(max-width: 640px) 78vw, 350px"
        />
      </div>
      <style jsx global>{`
        .swiper-prev::after,
        .swiper-next::after {
          content: none !important;
        }
      `}</style>
    </main>
  );
}
