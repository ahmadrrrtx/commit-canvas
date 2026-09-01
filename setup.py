from setuptools import setup

setup(
    name="commit-canvas",
    version="2.0.0",
    description="Turn any git repository into a cinematic, shareable story — chapters, a time machine, and a developer fingerprint",
    long_description=open("README.md", "r", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="Muhammad Ahmad (RRRTX)",
    author_email="ahmadrrrtx@gmail.com",
    url="https://github.com/ahmadrrrtx/commit-canvas",
    packages=["cc"],
    include_package_data=True,
    package_data={"cc": ["canvas.html"]},
    python_requires=">=3.8",
    install_requires=[],  # zero dependencies — stdlib only
    entry_points={
        "console_scripts": [
            "commit-canvas=cc.__main__:main",
        ],
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Environment :: Console",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Version Control :: Git",
        "Topic :: Artistic Software",
    ],
)
