import Image from "next/image";

export default function Footer() {
    return(
      <section id="footer">
        <div className="row-start-3 flex flex-col gap-[24px] items-center justify-center pb-8"><div className="flex gap-[24px] flex-wrap items-center justify-center">
        
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
        © {new Date().getFullYear()} Lakata. All rights reserved.
      </div>
    </div>
    </section>
    )
}