import subprocess as sp
import sys

if __name__ == "__main__":
	files = list(
		map(
			lambda f: f.split(" ")[-1], 
			filter(
				lambda f: len(f) > 0, 
				sp.check_output(["git", "status", "-s"]).decode("utf-8").split("\n")
			)
		)
	)

	for f in files:
		sp.run([
			"scp", 
			"-i",
			"C:/Users/agcum/Documents/Code/discord-repo/andrewc04_httpserver.pem", 
			"./" + f,
			"ubuntu@ec2-54-183-28-145.us-west-1.compute.amazonaws.com:/home/ubuntu/discord-repo/" + f
		])